import path from 'path';
import { exec } from 'child_process';
import fs from 'fs-extra';
import { isString } from 'lodash';
import { formatHomePath } from '@getflywheel/local/main';
import getOSBins from './getOSBins';
import { Providers } from '../types';
import type { Site, BackupSite } from '../types';
import {
	getBackupCredentials,
	getBackupSite,
} from './hubQueries';
import { getSiteDataFromDisk, providerToHubProvider } from './utils';

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
				/**
				 * @todo parse the error output to handle some potentially common cases (examples below)
				 *
				 * ------------------------------------------
				 * Insufficient file permissions (can happen with any executable)
				 * ------------------------------------------
				 * /bin/sh: 1: /home/matt/code/local-addon-backups/vendor/linux/restic: Permission denied
				 *
				 *
				 * ------------------------------------------
				 * No repo has been created (this happens when running restic backup)
				 * ------------------------------------------
				 * Fatal: unable to open config file: <config/> does not exist
				 * Is there a repository at the following location?
				 * rclone:65d123d5-f245-41db-97v6-db89e16b7789
				 *
				 *
				 * ------------------------------------------
				 * OAuth token is undefined or empty
				 * ------------------------------------------
				 * 2021/02/08 15:13:15 Failed to create file system for ":drive:sd430a59-8f7d-4d66-a96b-5210fe031f5e": drive: failed when making oauth client: failed to create oauth client: empty token found - please run "rclone config reconnect :drive:"
				 *
				 */
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
 * See the docs on configuring on rclone remote entirely via env variables
 * @reference https://rclone.org/docs/#config-file
 *
 * @param cmd
 * @param provider
 */
async function execPromiseWithRcloneContext (cmd: string, provider: Providers): Promise<string> {
	const { type, clientID, token, appKey } = await getBackupCredentials(providerToHubProvider(provider));

	const upperCaseProvider = provider.toUpperCase();

	return execPromise(cmd, {
		/**
		 * This style of env variables is used to configure a specific remote type (ie drive or dropbox) rather than a named remote that
		 * already exists in an rclone config file. This can then be used with the rclone backend syntax (using a leading colon to define the backend - ie
		 * the "type" field in an rclone config file entry)
		 * An example of the backend syntax looks like: `rclone ls :drive:` as opposed to: `rclone ls drive:`
		 * The former tells rclone to use drive as the backend and the latter tells rclone to use an item in the config file named "drive"
		 */
		[`RCLONE_${upperCaseProvider}_TYPE`]: type,
		[`RCLONE_${upperCaseProvider}_CLIENT_ID`]: clientID,
		[`RCLONE_${upperCaseProvider}_TOKEN`]: token,
		[`RCLONE_${upperCaseProvider}_APP_KEY`]: appKey,
	});
}

/**
 * List all snapshots on a provider for a given site
 *
 * @todo Type the objects in the returned array
 *
 * @param site
 * @param provider
 */
export async function listSnapshots (site: Site, provider: Providers): Promise<[]> {
	const { localBackupRepoID } = site;

	if (!localBackupRepoID) {
		throw new Error('Could not list snapshots since to repo was found on the given provider');
	}

	try {


		const json = await execPromiseWithRcloneContext(
			`${bins.restic} --repo rclone::${provider}::${localBackupRepoID} snapshots --json`,
			provider,
		);

		return JSON.parse(json);
	} catch (err) {
		/**
		 * ------------------------------------------------------------------------
		 * Potential failure messages
		 * ------------------------------------------------------------------------
		 *
		 *
		 * ------------------------------------------------------------------------
		 * No repos exist
		 * ------------------------------------------------------------------------
		 * Error: Command failed: /home/matt/code/local-addon-backups/vendor/linux/restic --repo rclone::drive::<repo-uuid> snapshots --json
		 * Fatal: unable to open config file: <config/> does not exist
		 * Is there a repository at the following location?
		 * rclone::drive::<reop-uuid>
		 */
		console.error(err);
	}

	return [];
}


/**
 * Initialize a restic repository on a given provider
 *
 * @param site
 */
export async function initRepo ({ provider, encryptionPassword, localBackupRepoID }: {
	provider: Providers,
	encryptionPassword: string,
	localBackupRepoID: string,
}): Promise<string | void> {
	try {
		const flags = [
			'--json',
			`--password-command \"echo \'${encryptionPassword}\'\"`,
		];

		return await execPromiseWithRcloneContext(
			/**
			 * @todo use the sites uuid provided by Hub instead of site.id
			 */
			`${bins.restic} --repo rclone::${provider}:${localBackupRepoID} init ${flags.join(' ')}`,
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
		`${bins.rclone} lsjson :${provider}: --fast-list --use-json-log`,
		provider,
	);

	const repos = JSON.parse(json);

	return repos;
}

export async function backupSite (site: Site, provider: Providers): Promise<string | void> {
	const { localBackupRepoID } = getSiteDataFromDisk(site.id);

	const { password } = await getBackupSite(localBackupRepoID);

	if (!localBackupRepoID) {
		/**
		 * @todo Tell the UI that no backup id was found
		*/
		throw new Error(`No backup repo id found for ${site.name}`);
	}

	const expandedSitePath = formatHomePath(site.path);

	const ignoreFilePath = path.join(expandedSitePath, localBackupsIgnoreFileName);
	const defaultIgnoreFilePath = path.join(__dirname, '..', '..', 'resources', 'default-ignore-file');

	try {
		if (!fs.existsSync(ignoreFilePath)) {
			fs.copySync(defaultIgnoreFilePath, ignoreFilePath);
		}
	} catch(err) {
		console.error(err);
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
		`${bins.restic} --repo rclone::${provider}:${localBackupRepoID} backup ${flags.join(' ')} \'${expandedSitePath}\'`,
		provider,
	);
}
