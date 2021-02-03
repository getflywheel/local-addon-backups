import path from 'path';
import { exec } from 'child_process';
import fs from 'fs-extra';
import { isString } from 'lodash';
import { SiteData, formatHomePath } from '@getflywheel/local/main';
import getOSBins from './getOSBins';
import { Providers } from '../types';
import type { Site } from '../types';
import {
	getBackupCredentials,
	getBackupSite,
	createBackupSite,
	getBackupReposByProviderID,
	createBackupRepo,
} from './hubQueries';

/**
 * The Site type exported from @getflywheel/local does not have all of the fields on it that this needs
 * This provides an easy place to get a site and typecast it correctly
 *
 * @param id
 */
const getSiteByID = (id: Site['id']) => SiteData.getSite(id) as Site;

/**
 * The Site type exported from @getflywheel/local does not have all of the fields on it that this needs
 * This provides an easy place to typecast and update that site object while still satisfying the TS compiler
 *
 * @param id
 * @param sitePartial
 */
const updateSite = (id: Site['id'], sitePartial: Partial<Site>) => SiteData.updateSite(id, sitePartial);

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
	const { type, clientID, token, appKey } = await getBackupCredentials(provider);

	return execPromise(cmd, {
		[`RCLONE_CONFIG_${provider.toUpperCase()}_TYPE`]: type,
		[`RCLONE_CONFIG_${provider.toUpperCase()}_CLIENT_ID`]: clientID,
		[`RCLONE_CONFIG_${provider.toUpperCase()}_TOKEN`]: token,
		[`RCLONE_CONFIG_${provider.toUpperCase()}_APP_KEY`]: appKey,
	});
}

/**
 * Verify that a given repo exists on a remote provider
 *
 * @param provider
 */
export async function listSnapshots (site: Site, provider: Providers): Promise<string> {
	const { localBackupRepoID } = site;

	if (!localBackupRepoID) {
		throw new Error('Could not list snapshots since to repo was found on the given provider');
	}

	const flags = [
		'--fast-json',
	];

	return execPromiseWithRcloneContext(
		`${bins.rclone} lsjson ${provider}:${localBackupRepoID} ${flags.join(' ')}`,
		provider,
	);
}
/**
 * Initialize a restic repository on a given provider
 * @param site
 */
export async function initRepo (site: Site, provider: Providers): Promise<string | void> {
	try {
		let { localBackupRepoID } = getSiteByID(site.id);

		let encryptionPassword;
		let backupSiteID;

		if (localBackupRepoID) {
			const { uuid, password, id } = await getBackupSite(localBackupRepoID);

			localBackupRepoID = uuid;
			encryptionPassword = password;
			backupSiteID = id;
		} else {
			const { uuid, password, id } = await createBackupSite(site);

			localBackupRepoID = uuid;
			encryptionPassword = password;
			backupSiteID = id;
		}

		/**
		 * @todo figure out how to query for repos by uuid of the site backup objects
		 */
		const backupRepo = (await getBackupReposByProviderID(provider)).find(({ hash }) => hash === localBackupRepoID);

		/**
		 * If no backup repo is found, than we probably haven't created on on the hub side for the given provider
		 */
		if (!backupRepo) {
			await createBackupRepo(site, provider);
		}

		updateSite(site.id, { localBackupRepoID });

		const flags = [
			'--json',
			`--password-command \"echo \'${encryptionPassword}\'\"`,
		];

		return execPromiseWithRcloneContext(
			/**
			 * @todo use the sites uuid provided by Hub instead of site.id
			 */
			`${bins.restic} --repo rclone:${provider}:${localBackupRepoID} init ${flags.join(' ')}`,
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

export async function backupSite (site: Site, provider: Providers): Promise<string> {
	const { localBackupRepoID } = getSiteByID(site.id);

	const { password } = await getBackupSite(localBackupRepoID);

	if (!localBackupRepoID) {
		/**
		 * @todo Tell the UI that no backup id was found
		*/
		throw new Error(`No backup repo id found for ${site.name}`);
	}

	const ignoreFilePath = path.join(site.path, localBackupsIgnoreFileName);
	const defaultIgnoreFilePath = path.join(__dirname, 'resources', 'default-ignore-file');

	if (!fs.existsSync(ignoreFilePath)) {
		fs.copyFileSync(defaultIgnoreFilePath, ignoreFilePath);
	}

	const flags = [
		'--json',
		`--password-command "echo \'${password}\'"`,
		`--exclude-file \'${ignoreFilePath}\'`,
	];

	return execPromiseWithRcloneContext(
		/**
		 * @todo use the sites uuid provided by Hub instead of site.id
		 */
		`${bins.restic} --repo rclone:${provider}:${localBackupRepoID} backup ${flags.join(' ')} \'${formatHomePath(site.path)}\'`,
		provider,
	);
}
