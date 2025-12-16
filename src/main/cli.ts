import { exec, execFile, spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
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
	repoID?: string;
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

type ExecPromiseOptions = {
	signal?: AbortSignal;
	abortable?: boolean;
};

let activeChild: ReturnType<typeof spawn> | null = null;

function isAbortError(err: unknown): boolean {
	const anyErr = err as any;
	return (
		anyErr?.name === 'AbortError' ||
		anyErr?.code === 'ABORT_ERR' ||
		String(anyErr?.message || '').toLowerCase().includes('aborted')
	);
}

function execFilePromise(file: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		execFile(file, args, (error) => {
			if (error) {
				return reject(error);
			}
			resolve();
		});
	});
}

async function killPidTree(pid?: number): Promise<void> {
	// `child.pid` can be `undefined` in some failure scenarios; also guard against non-positive values.
	// Note: PIDs returned by spawn are positive integers.
	if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) {
		return;
	}

	if (process.platform === 'win32') {
		// /T = kill child process tree, /F = force
		await execFilePromise('taskkill', ['/PID', String(pid), '/T', '/F']);
		return;
	}

	// Prefer process-group kill (negative pid) when we spawned detached
	try {
		process.kill(-pid, 'SIGTERM');
	} catch (e) {
		// Fallback to direct kill
		try {
			process.kill(pid, 'SIGTERM');
		} catch {
			// noop
		}
	}

	// Escalate if still running after a brief grace period
	await new Promise((r) => setTimeout(r, 1500));

	try {
		process.kill(-pid, 'SIGKILL');
	} catch (e) {
		try {
			process.kill(pid, 'SIGKILL');
		} catch {
			// noop
		}
	}
}

export async function killActiveCommand(): Promise<void> {
	const child = activeChild;
	if (!child?.pid) {
		return;
	}

	const pid = child.pid;
	activeChild = null;

	try {
		await killPidTree(pid);
	} catch {
		// noop
	}
}

/**
 * Utility to generate the --repo flag and argument for restic
 *
 * @param provider
 * @param localBackupRepoID
 */
// eslint-disable-next-line arrow-body-style
const makeRepoFlag = (provider: Providers, localBackupRepoID: string, site) => {
	if (!localBackupRepoID) {
		throw new Error('No repo id found for this site');
	}

	let fullRemotePath: string;

	switch (provider) {
		case Providers.Drive:
			fullRemotePath = `LocalBackups/${localBackupRepoID}`;
			break;
		default:
			fullRemotePath = localBackupRepoID;
	}

	if (process.platform === 'win32') {
		/**
		 *  Restic blows up if we pass it a path that contains "C:\", so we'll find the relative path
		 *  to the rclone binary from our current working directory (the site).
		 */
		const relativeRCLONEPath = path.relative(formatHomePath(site.path), bins.rclone)
			.replace(/\\/g,'/') // Convert backslashes to forward which restic expects.
			.replace('Local Beta', 'LOCALB~1'); // Use weird Windows specific format to avoid spaces in our command.

		return `--repo rclone::${provider}:${fullRemotePath} -o rclone.program="${relativeRCLONEPath}"`;
	}

	/**
	 * Note the double colon. This is because we are combining the restic syntax to use rclone as a backend
	 * along with the rclone :backend: syntax.
	 */
	return `--repo rclone::${provider}:${fullRemotePath}`;
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
async function execPromise (
	cmd: string,
	site: Site,
	env: { [key: string]: string } = {},
	opts: ExecPromiseOptions = {},
): Promise<string> {
	const shouldUseSpawn = !!(opts.signal || opts.abortable);

	if (shouldUseSpawn) {
		return new Promise((resolve, reject) => {
			const child = spawn(cmd, {
				shell: true,
				detached: process.platform !== 'win32',
				windowsHide: true,
				env: {
					...process.env,
					...env,
					PATH: `${bins.binDir}${path.delimiter}${process.env.PATH}`,
				},
				cwd: formatHomePath(site.path),
				signal: opts.signal,
			} as any);

			if (opts.abortable) {
				activeChild = child;
			}

			let stdout = '';
			let stderr = '';
			let stdoutBytes = 0;
			let stderrBytes = 0;
			const maxBuffer = 1024 * 1024 * 4;
			let settled = false;
			let overflowHandled = false;

			const safeResolve = (value: string) => {
				if (settled) return;
				settled = true;
				resolve(value);
			};

			const safeReject = (error: unknown) => {
				if (settled) return;
				settled = true;
				reject(error);
			};

			child.stdout?.on('data', (chunk) => {
				const str = chunk.toString();
				stdout += str;
				stdoutBytes += Buffer.byteLength(str);
				if (stdoutBytes + stderrBytes > maxBuffer) {
					if (!overflowHandled) {
						overflowHandled = true;
						void killPidTree(child.pid ?? undefined);
						safeReject(new Error('Command output exceeded maxBuffer'));
					}
				}
			});

			child.stderr?.on('data', (chunk) => {
				const str = chunk.toString();
				stderr += str;
				stderrBytes += Buffer.byteLength(str);
				if (stdoutBytes + stderrBytes > maxBuffer) {
					if (!overflowHandled) {
						overflowHandled = true;
						void killPidTree(child.pid ?? undefined);
						safeReject(new Error('Command output exceeded maxBuffer'));
					}
				}
			});

			child.on('error', (error) => {
				if (activeChild === child) {
					activeChild = null;
				}
				// Normalize abort errors
				if (isAbortError(error)) {
					(error as any).name = 'AbortError';
				}
				safeReject(error);
			});

			child.on('close', (code, signal) => {
				if (activeChild === child) {
					activeChild = null;
				}

				if (code === 0) {
					return safeResolve(stdout);
				}

				// If aborted, surface as AbortError
				if (opts.signal?.aborted || signal) {
					const abortErr = new Error('Command aborted');
					(abortErr as any).name = 'AbortError';
					return safeReject(abortErr);
				}

				const err = new Error(`Command failed with exit code ${code}: ${stderr || stdout}`);
				(err as any).stdout = stdout;
				(err as any).stderr = stderr;
				safeReject(err);
			});
		});
	}

	return new Promise((resolve, reject) => {
		exec(
			cmd,
			{
				// 4 times the default.
				maxBuffer: 1024 * 1024 * 4,
				env: {
					...process.env,
					...env,
					PATH: `${bins.binDir}${path.delimiter}${process.env.PATH}`,
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
async function execPromiseWithRcloneContext (opts: {
	cmd: string;
	site: Site;
	provider: Providers;
	encryptionPassword: string;
	signal?: AbortSignal;
	abortable?: boolean;
}): Promise<string> {
	const { cmd, site, provider, encryptionPassword, signal, abortable } = opts;
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
		['RESTIC_PASSWORD']: encryptionPassword,
	}, { signal, abortable });
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
			cmd: `"${bins.restic}" ${makeRepoFlag(provider, localBackupRepoID, site)} init ${flags.join(' ')}`,
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

		throw new Error(err);
	}
}

/** Creates a new restic snapshot on a given provider */
export function createSnapshot (site: Site, provider: Providers, encryptionPassword: string) {
	const { localBackupRepoID } = getSiteDataFromDisk(site.id);

	if (!localBackupRepoID) {
		throw new Error(`No backup repo id found for ${site.name}`);
	}

	const flags = [
		'--json',
		`--exclude "${excludePatterns.join(' ')}"`,
		`--exclude-file "${getIgnoreFilePath(site)}"`,
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
		cmd: `"${bins.restic}" ${makeRepoFlag(provider, localBackupRepoID, site)} ${flags.join(' ')} backup .`,
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
	const { site, provider, encryptionPassword, snapshotID, restoreDir, restoringToNewSite, repoID } = options;
	let { localBackupRepoID } = getSiteDataFromDisk(site.id);

	if (repoID) {
		localBackupRepoID = repoID;
	}

	const flags = [
		'--json',
		`--target ${restoreDir}`,
	];

	if (!restoringToNewSite) {
		flags.push(`--exclude ${metaDataFileName}`);
	}

	return execPromiseWithRcloneContext({
		cmd: `"${bins.restic}" ${makeRepoFlag(provider, localBackupRepoID, site)} restore ${snapshotID} ${flags.join(' ')} `,
		site,
		provider,
		encryptionPassword,
	});
}

/**
 * Check if a restic repository exists on the remote provider
 *
 * @param options Repository check options
 * @returns true if repo exists, false if it doesn't
 */
export async function checkRepoExists (options: {
	provider: Providers;
	encryptionPassword: string;
	localBackupRepoID: string;
	site: Site;
	signal?: AbortSignal;
}): Promise<boolean> {
	const { provider, encryptionPassword, localBackupRepoID, site, signal } = options;

	try {
		// Try to list snapshots - if this succeeds, repo exists
		await execPromiseWithRcloneContext({
			cmd: `"${bins.restic}" ${makeRepoFlag(provider, localBackupRepoID, site)} snapshots --json --quiet`,
			site,
			provider,
			encryptionPassword,
			signal,
			abortable: true,
		});
		return true;
	} catch (err) {
		if (isAbortError(err)) {
			throw err;
		}
		// Repo doesn't exist or is inaccessible
		logger.warn(`Repo ${localBackupRepoID} on ${provider} does not exist or is inaccessible: ${err}`);
		return false;
	}
}

/**
 * Add a new password key to an existing restic repository
 * This allows the repo to be accessed with either the old password or the new one
 * This function is idempotent - it checks if the new password already works before adding a key
 *
 * @param options Rekey options
 */
export enum RekeyStatus {
	Success = 'success',
	RepoNotFound = 'repoNotFound',
}

export async function rekeyRepo (options: {
	provider: Providers;
	oldPassword: string;
	newPassword: string;
	localBackupRepoID: string;
	site: Site;
	signal?: AbortSignal;
}): Promise<RekeyStatus> {
	const {
		provider,
		oldPassword,
		newPassword,
		localBackupRepoID,
		site,
		signal,
	} = options;
	const hubProvider = providerToHubProvider(provider);

	// Create a temporary file for the new password
	const tmpPasswordFile = path.join(formatHomePath(site.path), `.tmp-new-password-${Date.now()}.txt`);

	try {
		const { type, clientID, token, appKey } = await getBackupCredentials(hubProvider);

		// Validate credentials before attempting to use them
		if (!token || token.trim() === '') {
			throw new Error(`Invalid or expired ${provider} OAuth token. Please reconnect ${provider} in Local settings.`);
		}

		const upperCaseProvider = provider.toUpperCase();

		// First check if the new password already works (idempotent check)
		try {
			await execPromise(
				`"${bins.restic}" ${makeRepoFlag(provider, localBackupRepoID, site)} snapshots --json --quiet`,
				site,
				{
					[`RCLONE_${upperCaseProvider}_TYPE`]: type,
					[`RCLONE_${upperCaseProvider}_CLIENT_ID`]: clientID,
					[`RCLONE_${upperCaseProvider}_TOKEN`]: token,
					[`RCLONE_${upperCaseProvider}_APP_KEY`]: appKey,
					['RESTIC_PASSWORD']: newPassword,
				},
				{ signal, abortable: true },
			);

			// If we got here, the new password already works - no need to add another key
			logger.info(`Repo ${localBackupRepoID} already has the new password, skipping rekey`);
			return RekeyStatus.Success;
		} catch (err) {
			// Check if this is a token/auth error
			const errorStr = String(err);
			if (errorStr.includes('empty token') || errorStr.includes('oauth client') || errorStr.includes('401')) {
				throw new Error(`${provider} authentication expired. Please reconnect ${provider} in Local settings and try migration again.`);
			}
			// New password doesn't work yet, continue with adding the key
			logger.info(`New password doesn't work yet for repo ${localBackupRepoID}, adding key`);
		}

		// Write the new password to a temporary file
		fs.writeFileSync(tmpPasswordFile, newPassword);

		// Use the old password via RESTIC_PASSWORD, and provide the new password via file
		await execPromise(
			`"${bins.restic}" ${makeRepoFlag(provider, localBackupRepoID, site)} key add --new-password-file "${tmpPasswordFile}"`,
			site,
			{
				[`RCLONE_${upperCaseProvider}_TYPE`]: type,
				[`RCLONE_${upperCaseProvider}_CLIENT_ID`]: clientID,
				[`RCLONE_${upperCaseProvider}_TOKEN`]: token,
				[`RCLONE_${upperCaseProvider}_APP_KEY`]: appKey,
				['RESTIC_PASSWORD']: oldPassword,
			},
			{ signal, abortable: true },
		);

		logger.info(`Successfully added new key to repo ${localBackupRepoID}`);
		return RekeyStatus.Success;
	} catch (err) {
		// Detect a "repo not found" scenario and return a non-fatal status
		const errStr = String(err);
		if (errStr.includes('does not exist') || errStr.includes('repository not found') || errStr.includes('Is there a repository at')) {
			logger.warn(`Repo ${localBackupRepoID} appears missing during rekey on ${provider}`);
			return RekeyStatus.RepoNotFound;
		}
		throw new Error(`Failed to rekey repo ${localBackupRepoID} on ${provider}: ${err}`);
	} finally {
		// Always clean up the temporary password file
		if (fs.existsSync(tmpPasswordFile)) {
			fs.removeSync(tmpPasswordFile);
		}
	}
}

/**
 * Write a metadata JSON file to the cloud provider using rclone
 *
 * @param options Metadata write options
 */
export async function writeMetadataFile (options: {
	provider: Providers;
	localBackupRepoID: string;
	snapshotHash: string;
	metadata: string;
	site: Site;
	signal?: AbortSignal;
}): Promise<void> {
	const { provider, localBackupRepoID, snapshotHash, metadata, site, signal } = options;
	const hubProvider = providerToHubProvider(provider);

	// Determine the metadata path based on provider
	// For Dropbox: metadata/{repo-id}/snapshot-{hash}.json
	// For Drive: LocalBackups/metadata/{repo-id}/snapshot-{hash}.json
	let metadataPath: string;
	if (provider === Providers.Drive) {
		metadataPath = `LocalBackups/metadata/${localBackupRepoID}/snapshot-${snapshotHash}.json`;
	} else {
		// Dropbox stores at root level
		metadataPath = `metadata/${localBackupRepoID}/snapshot-${snapshotHash}.json`;
	}

	const { type, clientID, token, appKey } = await getBackupCredentials(hubProvider);

	// Validate credentials
	if (!token || token.trim() === '') {
		throw new Error(`Invalid or expired ${provider} OAuth token. Please reconnect ${provider} in Local settings.`);
	}

	const upperCaseProvider = provider.toUpperCase();

	// Create a temporary file with the metadata
	const tmpFile = path.join(formatHomePath(site.path), `.tmp-metadata-${snapshotHash}.json`);
	try {
		fs.writeFileSync(tmpFile, metadata);

		// Use rclone to copy the file to the provider
		await execPromise(
			`"${bins.rclone}" copyto "${tmpFile}" ":${provider}:${metadataPath}"`,
			site,
			{
				[`RCLONE_${upperCaseProvider}_TYPE`]: type,
				[`RCLONE_${upperCaseProvider}_CLIENT_ID`]: clientID,
				[`RCLONE_${upperCaseProvider}_TOKEN`]: token,
				[`RCLONE_${upperCaseProvider}_APP_KEY`]: appKey,
			},
			{ signal, abortable: true },
		);
	} finally {
		// Clean up temp file
		if (fs.existsSync(tmpFile)) {
			fs.removeSync(tmpFile);
		}
	}
}
