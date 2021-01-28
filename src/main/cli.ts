import path from 'path';
import { exec } from 'child_process';
import { EOL } from 'os';
import fs from 'fs-extra';
import gql from 'graphql-tag';
import { isString } from 'lodash';
import tmp from 'tmp';
import type { Site } from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import getOSBins from './getOSBins';
import { Providers } from '../types';

/**
 * Ensure that any temp files we write get removed on process exit
 * @reference https://github.com/raszi/node-tmp#graceful-cleanup
 */
tmp.setGracefulCleanup();

const serviceContainer = LocalMain.getServiceContainer().cradle;
/* @ts-ignore */
const { localHubAPI } = serviceContainer;

const bins = getOSBins();

/**
 * Helper to promisify executing shell commands. The point behind using this over child_process.execSync is
 * that this will help mitigate long thread blocking commands like initializing a repo with restic
 *
 * @param cmd
 * @param env
 */
async function execPromise (cmd: string, env: { [key: string]: string } = {}): Promise<Error | string> {
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
 * Convert a config object from Local Hub into the TOML format that rclone expects its config file to be in
 *
 * @todo use a TOML parsing lib instead
 *
 * @param config
 * @param providerID
 */
function configObjectToToml (config: { [key: string ]: string }, providerID: Providers): string {
	const contents = `[${providerID}]${EOL}`;

	return Object.entries(config).reduce((contents, [key, value]) => {
		contents += `${key} = ${value}${EOL}`;

		return contents;
	}, contents);
}

/**
 * Get an rclone config for a provider and save it to disk in a temp file.
 *
 * Returns the path to the temp file
 *
 * @param providerID
 */
async function setupTempRcloneConfig (provider: Providers): Promise<string> {
	try {
		const { data } = await localHubAPI.client.mutate({
			mutation: gql`
				mutation getBackupCredentials($providerID: String!) {
				  getBackupCredentials(provider_id: $providerID) {
				    provider_id
				    config
				  }
				}
			`,
			variables: {
				providerID: provider,
			},
		});

		const tmpFile = tmp.fileSync({ postfix: '.conf' });

		const rcloneConfig = { ...data?.getBackupCredentials?.config };

		fs.writeFileSync(
			tmpFile.name,
			configObjectToToml(rcloneConfig, provider),
		);

		return tmpFile.name;
	} catch (err) {
		console.error(err);
		return '';
	}
}

async function execPromiseWithRcloneContext (cmd: string, provider: Providers): Promise<Error | string> {
	const rcloneConfigFile = await setupTempRcloneConfig(provider);
	console.log('config path.......', rcloneConfigFile);

	return execPromise(cmd, { 'RCLONE_CONFIG': rcloneConfigFile });
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
 * @todo get this from hub
 */
const fakePassword = 'password';

/**
 *
 * @todo figure out how we are naming repos
 */

/**
 * Intitialize a restic repository on a given provider
 *
 * @param site
 */
export async function initRepo (site: Site, provider: Providers): Promise<void> {
	try {
		const { data } = localHubAPI.client.mutate({
			mutation: gql`
				mutation createBackupSite($siteName: String!, $siteUrl: String!) {
					createBackupSite(name: $siteName, url: $siteUrl) {
				    	uuid
						password
				  }
				}
			`,
			variables: {
				siteName: site.name,
				siteUrl: site.url,
			},
		});

		const { password: encryptionPassword, uuid: repoName } = data.createBackupSite;

		/**
		 * @todo Store the uuid on disk with the appropriate site in sites.json
		 */

		const flags = [
			'--json',
			`--password-command \"echo \'${encryptionPassword}\'\"`,
		];

		await execPromiseWithRcloneContext(
			/**
			 * @todo use the sites uuid provided by Hub instead of site.id
			 */
			`${bins.restic} --repo rclone:${provider}:${repoName} init ${flags.join(' ')}`,
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

export async function backupSite (site: Site, provider: Providers): Promise<void> {
	try {
		const { data } = localHubAPI.client.query({
			query: gql`
				query getBackupSite ($repoID: String) {
				  backupSites(uuid: $repoID) {
				    id
				    name
				    url
				    uuid
				    created_at
				    updated_at
				  }
				}
			`,
			variables: {
				/**
				 * @todo pass the uuid that was stored to disk after the createBackuSite call during repo initialization
				 */
			},
		});

		const flags = [
			'--json',
			`--password-command "echo \'${fakePassword}`,
			`--exclude-file ${path.join(site.path, '.localbackupsignore')}`,
		];

		execPromiseWithRcloneContext(
			/**
			 * @todo use the sites uuid provided by Hub instead of site.id
			 */
			`${bins.restic} --repo rclone:${provider}:${site.id} backup ${flags.join(' ')} ${site.path}`,
			provider,
		);
	} catch (err) {
		console.error(err);
	}
}
