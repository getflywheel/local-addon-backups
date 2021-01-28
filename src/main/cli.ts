import path from 'path';
import { exec } from 'child_process';
import fs from 'fs-extra';
import { isString } from 'lodash';
import type { Site } from '@getflywheel/local';
import { SiteData, formatHomePath } from '@getflywheel/local/main';
import getOSBins from './getOSBins';
import { Providers } from '../types';
import { getBackupCredentials, getBackupSite, createBackupSite } from './hubQueries';


const bins = getOSBins();

const localBackupsIgnoreFileName = '.localbackupaddonignore';

/**
 * Helper to promisify executing shell commands. The point behind using this over child_process.execSync is
 * that this will help mitigate long thread blocking commands like initializing a repo with restic
 *
 * @param cmd
 * @param env
 */
async function execPromise (cmd: string, env: { [key: string]: string } = {}): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(
			`${cmd}`,
			{
				env: {
					...process.env,
					...env,
				},
			},
			(error, stdout, stderr) => {
				if (error) {
					return reject(error);
				}

				resolve(stdout);
			},
		);
	});
}

/**
 * Execute a command in a shell with rclone configuration options set for a given provider
 *
 * @param cmd
 * @param provider
 */
async function execPromiseWithRcloneContext (cmd: string, provider: Providers): Promise<string> {
	const { type, clientID, token } = await getBackupCredentials(provider);

	return execPromise(cmd, {
		[`RCLONE_CONFIG_${provider.toUpperCase()}_TYPE`]: type,
		[`RCLONE_CONFIG_${provider.toUpperCase()}_CLIENT_ID`]: clientID,
		[`RCLONE_CONFIG_${provider.toUpperCase()}_TOKEN`]: token,
	});
}

/**
 * Verify that a given repo exists on a remote provider
 *
 * @param provider
 */
export async function verifyRepo (provider: Providers): Promise<void> {
	const repoName = 'Local Backups';

	const flags = [
		'--fast-json',
	];

	await execPromiseWithRcloneContext(
		`${bins.rclone} lsjson ${repoName}: ${flags.join(' ')}`,
		provider,
	);
}

/**
 * Intitialize a restic repository on a given provider
 *
 * @param site
 */
export async function initRepo (site: Site, provider: Providers): Promise<void> {
	try {
		/* @ts-ignore */
		const { localBackupRepoID } = SiteData.getSite(site.id);

		let localBackupRepoIDGetter = () => getBackupSite(localBackupRepoID);

		if (!localBackupRepoID) {
			localBackupRepoIDGetter = () => createBackupSite(site);
		}

		const { password: encryptionPassword, uuid } = await localBackupRepoIDGetter();

		/* @ts-ignore */
		SiteData.updateSite(site.id, { localBackupRepoID: uuid });

		const flags = [
			'--json',
			`--password-command \"echo \'${encryptionPassword}\'\"`,
		];

		await execPromiseWithRcloneContext(
			/**
			 * @todo use the sites uuid provided by Hub instead of site.id
			 */
			`${bins.restic} --repo rclone:${provider}:${uuid} init ${flags.join(' ')}`,
			provider,
		);
	} catch (err) {
		if (isString(err) && err.includes('Fatal: config file already exists')) {
			/**
			 * the repo has already been initted!
			 *
			 * @todo handle the case that the repo has already been initted
			 */
		}

		console.error(err);
	}
}

/**
 * List all repos in a given provider
 *
 * @todo Do we need this?
 *
 * @param provider
 */
export async function listRepos (provider: Providers): Promise<string> {
	const json = await execPromiseWithRcloneContext(
		`${bins.rclone} lsjson ${provider}: --fast-list --use-json-log`,
		provider,
	);

	const repos = JSON.parse(json);

	return repos;
}

export async function backupSite (site: Site, provider: Providers): Promise<void> {
	/* @ts-ignore */
	const { localBackupRepoID } = SiteData.getSite(site.id);

	const { password } = await getBackupSite(localBackupRepoID);

	if (!localBackupRepoID) {
		/**
		 * @todo Tell the UI that no backup id was found
		 */
		throw new Error(`No backup repo id found for ${site.name}`);
	}

	const flags = [
		'--json',
		`--password-command "echo \'${password}\'"`,
	];

	const ignoreFilePath = path.join(site.path, localBackupsIgnoreFileName);

	if (fs.existsSync(ignoreFilePath)) {
		flags.push(`--exclude-file \'${ignoreFilePath}\'`);
	}

	execPromiseWithRcloneContext(
		/**
		 * @todo use the sites uuid provided by Hub instead of site.id
		 */
		`${bins.restic} --repo rclone:${provider}:${localBackupRepoID} backup ${flags.join(' ')} \'${formatHomePath(site.path)}\'`,
		provider,
	);
}
