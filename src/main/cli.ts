import { exec } from 'child_process';
import { isString } from 'lodash';
import { formatHomePath, getServiceContainer } from '@getflywheel/local/main';
import getOSBins from './getOSBins';
import { Providers } from '../types';
import type { Site } from '../types';
import { metaDataFileName } from '../constants';
import { getBackupCredentials } from './hubQueries';
import { getSiteDataFromDisk, providerToHubProvider } from './utils';
import { excludePatterns, getIgnoreFilePath } from '../helpers/ignoreFilesPattern';

interface RestoreFromBackupOptions {
	site: Site;
	provider: Providers;
	encryptionPassword: string;
	snapshotID: string;
	restoreDir: string;
	restoringToNewSite?: boolean;
}

const bins = getOSBins();

/**
 * Hardcoded values that we always want to ignore with restic or when restoring a site backup
 *
 * These patterns will be interpreted as glob patterns
 * - node-glob in this add-on
 * - The Go standard lib in restic with either: (See the restic docs for more info: https://restic.readthedocs.io/en/latest/040_backup.html#excluding-files)
 * 		- https://golang.org/pkg/path/filepath/#Glob
 * 		- https://golang.org/pkg/os/#ExpandEnv
 *
 * The values included here are auto generated things by Local/Wordpress that
 * either aren't necessary or could cause errors upon restoring the site
 */
const serviceContainer = getServiceContainer().cradle;
const { localLogger } = serviceContainer;

const logger = localLogger.child({
	thread: 'main',
	class: 'BackupAddonCLIService',
});

/**
 * Utility to generate the --repo flag and argument for restic
 *
 * @param provider
 * @param localBackupRepoID
 */
// eslint-disable-next-line arrow-body-style
const makeRepoFlag = (provider: Providers, localBackupRepoID: string) => {
	if (!localBackupRepoID) {
		throw new Error('No repo id found for this site');
	}
	/**
	 * Note the double colon. This is because we are combining the restic syntax to use rclone as a backend
	 * along with the rlcone :backend: syntax.
	 */
	return `--repo rclone::${provider}:${localBackupRepoID}`;
};

/**
 * Helper to promisify executing shell commands. The point behind using this over child_process.execSync is
 * that this will help mitigate long thread blocking commands like initializing a repo with restic
 *
 * @todo export/use execPromise from Local or use the child_process.exitFile
 *
 * @param cmd
 * @param env
 */
async function execPromise (cmd: string, site: Site, env: { [key: string]: string } = {}): Promise<string> {
	return new Promise((resolve, reject) => {
		exec(
			`${cmd}`,
			{
				env: {
					...process.env,
					...env,
					PATH: `${bins.binDir}:${process.env.PATH}`,
				},
				cwd: formatHomePath(site.path),
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
async function execPromiseWithRcloneContext (opts: { cmd: string; site: Site; provider: Providers; encryptionPassword: string; }): Promise<string> {
	const { cmd, site, provider, encryptionPassword } = opts;
	const { type, clientID, token, appKey } = await getBackupCredentials(providerToHubProvider(provider));

	const upperCaseProvider = provider.toUpperCase();

	return execPromise(cmd, site, {
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
		/**
		 * Define a command that restic can use to get the repository password dynamically. It's useful to set here as opposed to command line flag
		 * since this only lives inside the scope of the spawned shell which should gaurd against the password getting dumped to a log file
		 */
		['RESTIC_PASSWORD']: `\"${encryptionPassword}\"`,
	});
}

/**
 * Initialize a restic repository on a given provider
 *
 * @param site
 */
export async function initRepo ({ provider, encryptionPassword, localBackupRepoID, site }: {
	provider: Providers,
	encryptionPassword: string,
	localBackupRepoID: string,
	site: Site,
}): Promise<string | void> {
	try {
		const flags = [
			'--json',
		];

		return await execPromiseWithRcloneContext({
			cmd: `"${bins.restic}" ${makeRepoFlag(provider, localBackupRepoID)} init ${flags.join(' ')}`,
			site,
			provider,
			encryptionPassword,
		});
	} catch (err) {
		if (isString(err) && err.includes('Fatal: config file already exists')) {
			/**
			 * The repo has already been initted. Log the error for reference but don't pass the error up the call stack
			 * so that the BackupService can seamlessly continue creating a site backup
			 */
			logger.warn(err);
			return;
		}

		logger.error(err);
	}
}

/**
 * Creates a new restic snapshot on a given provider
 *
 * @param site
 * @param provider
 * @param encryptionPassword
 * @returns
 */
export async function createSnapshot (site: Site, provider: Providers, encryptionPassword: string): Promise<string> {
	const { localBackupRepoID } = getSiteDataFromDisk(site.id);

	if (!localBackupRepoID) {
		throw new Error(`No backup repo id found for ${site.name}`);
	}

	const ignoreFilePath = getIgnoreFilePath(site);

	const flags = [
		'--json',
		`--exclude "${excludePatterns.join(' ')}"`,
		`--exclude-file \'${ignoreFilePath}\'`,
	];

	/**
	 * @todo Handle the following error(s)
	 *
	 * If the password is undefined, restic will throw this error:
	 * Error: Command failed: restic --repo rclone::drive:<uuid> backup --json --password-command "echo 'undefined'" --exclude-file '/home/matt/Local Sites/0/.localbackupaddonignore' '/home/matt/Local Sites/0'
Fatal: wrong password or no key found
	 */

	return execPromiseWithRcloneContext({
		/**
		 * This passes "." as the path since we cwd of the shell to the site
		 */
		cmd: `"${bins.restic}" ${makeRepoFlag(provider, localBackupRepoID)} ${flags.join(' ')} backup .`,
		site,
		provider,
		encryptionPassword,
	});
}

/**
 * Restore an rclone backup from a given provider into the path specified by options.siteTmpDir
 * --exclude and --include can be used here to backup just a subset of the files from a given backup
 *
 * @param options
 */
export async function restoreBackup (options: RestoreFromBackupOptions) {
	const { site, provider, encryptionPassword, snapshotID, restoreDir, restoringToNewSite } = options;
	const { localBackupRepoID } = getSiteDataFromDisk(site.id);

	const flags = [
		'--json',
		`--target ${restoreDir}`,
	];

	if (!restoringToNewSite) {
		flags.push(`--exclude ${metaDataFileName}`);
	}

	return execPromiseWithRcloneContext({
		cmd: `"${bins.restic}" ${makeRepoFlag(provider, localBackupRepoID)} restore ${snapshotID} ${flags.join(' ')} `,
		site,
		provider,
		encryptionPassword,
	});
}
