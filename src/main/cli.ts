import path from 'path';
import { exec, execSync } from 'child_process';
import fs from 'fs-extra';
import { isString } from 'lodash';
import { SiteData, formatHomePath, getServiceContainer } from '@getflywheel/local/main';
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

const serviceContainer = getServiceContainer().cradle;

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

/**
 * Helper to read site data from disk
 *
 * @param id
 */
const getSiteDataFromDisk = (id: Site['id']) => {
	const sites = serviceContainer.userData.get('sites');
	return sites[id];
};

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
				console.log('callback.....', error, stdout, stderr);

				/**
				 * @todo parse the error output to handle some potentially common cases (examples below)
				 *
				 * Insufficient file permissions (can happen with any executable)
				 * ------------------------------------------
				 * /bin/sh: 1: /home/matt/code/local-addon-backups/vendor/linux/restic: Permission denied
				 *
				 * No repo has been created (this happens when running restic backup)
				 * ------------------------------------------
				 * Fatal: unable to open config file: <config/> does not exist
				 * Is there a repository at the following location?
				 * rclone:65d123d5-f245-41db-97v6-db89e16b7789
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
 * @param cmd
 * @param provider
 */
async function execPromiseWithRcloneContext (cmd: string, provider: Providers): Promise<string> {
	const { type, clientID, token: baseToken, appKey } = await getBackupCredentials(provider);

	const token = `'${baseToken.replace(/"/g, '\\"')}'`;

	console.log('running:', cmd, token);

	return await execPromise(cmd, {
		[`RCLONE_CONFIG_${provider.toUpperCase()}_TYPE`]: type,
		[`RCLONE_CONFIG_${provider.toUpperCase()}_CLIENT_ID`]: clientID,
		[`RCLONE_CONFIG_${provider.toUpperCase()}_TOKEN`]: token,
		[`RCLONE_CONFIG_${provider.toUpperCase()}_APP_KEY`]: appKey,
		// -----------------------------------------------------------------------------
		[`RCLONE_DRIVE_TYPE`]: type,
		[`RCLONE_DRIVE_CLIENT_ID`]: clientID,
		[`RCLONE_DRIVE_TOKEN`]: token,
		[`RCLONE_DRIVE_APP_KEY`]: appKey,
		// -----------------------------------------------------------------------------
		[`RCLONE_CONFIG_DRIVE_TYPE`]: type,
		[`RCLONE_CONFIG_DRIVE_CLIENT_ID`]: clientID,
		[`RCLONE_CONFIG_DRIVE_TOKEN`]: token,
		[`RCLONE_CONFIG_DRIVE_APP_KEY`]: appKey,
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
		'--fast-list',
		'--use-json-log',
	];

	return execPromiseWithRcloneContext(
		`${bins.rclone} lsjson ${provider}:${localBackupRepoID} ${flags.join(' ')}`,
		provider,
	);
}

/**
 * Initialize a restic repository on a given provider
 *
 * @param site
 */
export async function initRepo (site: Site, provider: Providers): Promise<string | void> {
	try {
		let { localBackupRepoID } = getSiteDataFromDisk(site.id);

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

		updateSite(site.id, { localBackupRepoID });

		/**
		 * @todo figure out how to query for repos by uuid of the site backup objects
		 * This should theoretically work, but currently appears to be broken on the Hub side:
		 *
		 * const backupRepo = await getBackupRepo(backupSiteID, provider);
		 */
		let backupRepo = (await getBackupReposByProviderID(provider)).find(({ hash }) => hash === localBackupRepoID);

		/**
		 * If no backup repo is found, than we probably haven't created on on the hub side for the given provider
		 */
		if (!backupRepo) {
			backupRepo = await createBackupRepo(backupSiteID, localBackupRepoID, provider);
		}

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
		console.error(err)
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
		`${bins.restic} --repo rclone:${provider}:${localBackupRepoID} backup ${flags.join(' ')} \'${expandedSitePath}\'`,
		provider,
	);
}


export async function arbitraryCmd (bin: string, cmd: string, provider: Providers): Promise<any> {
	console.log('running cmd')
	return await execPromiseWithRcloneContext(
		`${bins[bin]} ${cmd}`,
		provider,
	);
}