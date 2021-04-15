import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import type { HubOAuthProviders, Providers, Site } from './types';
import { getEnabledBackupProviders, getBackupReposByProviderID, getBackupSnapshots } from './main/hubQueries';
import { createBackup } from './main/services/backupService';
import { restoreFromBackup } from './main/services/restoreService';
import { getSiteDataFromDisk } from './main/utils';
import { cloneFromBackup } from './main/services/cloneFromBackupService';
import {  IPCASYNC_EVENTS } from './constants';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const listenerConfigs = [
		{
			channel: IPCASYNC_EVENTS.GET_ENABLED_PROVIDERS,
			callback: async () => await getEnabledBackupProviders(),
		},
		{
			channel: IPCASYNC_EVENTS.START_BACKUP,
			callback: async (siteId: Local.Site['id'], provider: Providers, description: string) => {
				const siteJSON = LocalMain.SiteData.getSite(siteId);
				const site = new Local.Site(siteJSON);

				return createBackup(site, provider, description);
			},
		},
		{
			channel: IPCASYNC_EVENTS.GET_SITE_PROVIDER_BACKUPS,
			callback: async (siteID: Site['id'], provider: HubOAuthProviders) => {
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
			channel: IPCASYNC_EVENTS.RESTORE_BACKUP,
			callback: async (opts: { siteID: Site['id']; provider: Providers; snapshotID: string }) => {
				const { siteID, ...rest } = opts;
				const site = getSiteDataFromDisk(siteID);
				return restoreFromBackup({ site, ...rest });
			},
		},
		{
			channel: IPCASYNC_EVENTS.CLONE_BACKUP,
			callback: async (baseSite: Local.Site, newSiteName: string, provider: Providers, snapshotHash: string) =>
				cloneFromBackup({ baseSite, newSiteName, provider, snapshotHash }),
		},
	];

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
