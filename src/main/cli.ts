import path from 'path';
import { exec } from 'child_process';
import fs from 'fs-extra';
import gql from 'graphql-tag';
import tmp from 'tmp';
import type { Site } from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import getOSBins from './getOSBins';

/**
 * Ensure that any temp files we write get removed on process exit
 * @reference https://github.com/raszi/node-tmp#graceful-cleanup
 */
tmp.setGracefulCleanup();

const serviceContainer = LocalMain.getServiceContainer().cradle;
/* @ts-ignore */
const { localHubAPI } = serviceContainer;

const bins = getOSBins();

enum Providers {
	Drive = 'drive',
	Dropbox = 'dropbox',
}

export async function execPromise (cmd: string, flags: string[] = [], env: { [key: string]: string } = {}): Promise<Error | string> {
	return new Promise((resolve, reject) => {
		exec(
			`${cmd} ${flags.join(' ')}`,
			{
				...process.env,
				env,
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

export function verifyRepo(provider: Providers) {
	const repoName = 'Local Backups';
	const dummyTokenJson = '{ access_token: null }'

	let flags = [
		/**
		 * either --drive-token || -- dropbox-token
		 *
		 * This should be a json blob in the form of
		 * {
		 *	access_token: string;
		 *  token_type: string;
		 *  expiry: string; (datetime)
		 * }
		 */
		`--${provider}-token ${dummyTokenJson}`,

	];

	execPromise(
		`${bins.rclone} lsjson ${repoName}: ${flags.join(' ')}`,
	);
}

const fakePassword = 'password';
const fakeRcloneConfigName = 'local-backups-addon-drive';

async function setupRcloneConfig (providerID: string): Promise<void | string> {
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
				providerID: providerID,
			},
		});

		const rcloneConfig = { [providerID]: data?.getBackupCredentials };
		const tmpFile = tmp.fileSync({ postfix: '.conf' });

		fs.writeFileSync(tmpFile.name, JSON.stringify(rcloneConfig));

		console.log('file contents...................', fs.readFileSync(tmpFile.name).toString(), data.getBackupCredentials);

		return tmpFile.name;

		// Clean up the file
		// tmpFile.removeCallback();
	} catch (err) {
		console.error(err);
	}
}

export async function initRepo (site: Site): Promise<void> {
	/**
	 * @todo make this configurable via function arg or whatever
	 */
	const providerID = 'google';

	const rcloneConfig = await setupRcloneConfig(providerID);

	console.log('config file.....', rcloneConfig)

	const res = await execPromise(
		// `${bins.rclone} lsjson google: --use-json-log --fast-list`,
		`${bins.rclone} config dump --config ${rcloneConfig}`,
		[],
		{
			/* @ts-ignore */
			// 'RCLONE_CONFIG': rcloneConfig,
		},
	);

	console.log('result.......', res);

	return;

	const flags = [
		'--json',
		`--password-command "echo \'${fakePassword}`,
		/**
		 * Not sure we actually need this here since init the repo doesn't even create a backup
		 */
		`--exclude-file ${path.join(site.path, '.resticignore')}`,
	];

	execPromise(
		`${bins.restic} --repo rclone:${providerID}:${site.id} init ${flags.join(' ')}`,
		[],
		{
			/* @ts-ignore */
			'RCLONE_CONFIG': rcloneConfig,
		},
	);
}

export async function backupSite (site: Site): Promise<void> {
	const flags = [
		'--json',
		`--password-command "echo \'${fakePassword}`,
		`--exclude-file ${path.join(site.path, '.resticignore')}`,
	];

	execPromise(
		`${bins.restic} --repo rclone:${fakeRcloneConfigName}:${site.id} backup ${flags.join(' ')} ${site.path}`,
	);
}

// restic --repo rclone:nested:one backup --verbose --json --password-command "echo password" .

