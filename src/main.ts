import { isString } from 'lodash';
import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import type { HubOAuthProviders, Providers, Site } from './types';
import { getEnabledBackupProviders, getBackupReposByProviderID, getBackupSnapshots } from './main/hubQueries';
import { createBackup } from './main/services/backupService';
import { restoreFromBackup } from './main/services/restoreService';
import { getSiteDataFromDisk } from './main/utils';


const emitErrorBanners = (listenerCb: (...args: any[]) => Promise<any>) => async (...args) => {
	try {
		return await listenerCb(...args);
	} catch (err) {
		if (isString(err) || !err.graphQLErrors) {
			throw new Error(err);
		}

		// Map graphql errors to more useful messages for end users
		const errorMessages = err.graphQLErrors.map(({ debugMessage }) => {
			if (debugMessage === 'Unauthenticated.') {
				return 'Uh-oh! It looks like you aren\'t logged into Hub. Please log in and try again';
			}

			return debugMessage;
		});

		throw new Error(errorMessages);
	}
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	let listenerConfigs = [
		{
			channel: 'backups:enabled-providers',
			callback: async () => getEnabledBackupProviders(),
		},
		{
			channel: 'backups:backup-site',
			callback: async (siteId: Local.Site['id'], provider: Providers) => {
				const siteJSON = LocalMain.SiteData.getSite(siteId);
				const site = new Local.Site(siteJSON);

				return createBackup(site, provider);
			},
		},
		{
			channel: 'backups:provider-snapshots',
			callback: async (siteID: Site['id'], provider: HubOAuthProviders) => {
				console.log('getting snapshots.........................')
				const site = getSiteDataFromDisk(siteID);
				const backupRepo = (await getBackupReposByProviderID(provider)).find(({ hash }) => hash === site.localBackupRepoID);

				if (!backupRepo) {
					return [];
				}

				/**
				 * @todo filtering the query directly by passing it a repo_id seems to be broken atm.
				 * Fix this up once the Hub side is working
				 */
				const snapshots = await getBackupSnapshots();
				return snapshots.filter(({ repoID }) => repoID === backupRepo.id);
			},
		},
		{
			channel: 'backups:restore-backup',
			callback: async (opts: { siteID: Site['id']; provider: Providers; snapshotID: string }) => {
				const { siteID, ...rest } = opts;
				const site = getSiteDataFromDisk(siteID);
				return restoreFromBackup({ site, ...rest });
			},
		},
	];

	listenerConfigs = listenerConfigs.map(({ channel, callback }) => ({
		channel,
		callback: emitErrorBanners(callback),
	}));

	listenerConfigs.forEach(({ channel, callback }) => {
		LocalMain.addIpcAsyncListener(channel, callback);
	});

	LocalMain.addIpcAsyncListener('start-site-backup', async (siteId: Local.Site['id'], provider: Providers) => {
		const site = LocalMain.SiteData.getSite(siteId);
	});

	LocalMain.addIpcAsyncListener('list-site-snapshots', async (siteId: Local.Site['id'], provider: Providers) => {
		const site = LocalMain.SiteData.getSite(siteId);
	});
}
