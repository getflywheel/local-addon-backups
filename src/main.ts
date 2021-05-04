import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import type { HubOAuthProviders, Providers, Site } from './types';
import { getEnabledBackupProviders, getBackupReposByProviderID, getBackupSnapshots } from './main/hubQueries';
import { createBackup } from './main/services/backupService';
import { restoreFromBackup } from './main/services/restoreService';
import { getSiteDataFromDisk } from './main/utils';
import { cloneFromBackup } from './main/services/cloneFromBackupService';
import { IPCASYNC_EVENTS } from './constants';
import { createIpcAsyncError, createIpcAsyncResult } from './helpers/createIpcAsyncResponse';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (): void {
	const listenerConfigs = [
		{
			channel: IPCASYNC_EVENTS.GET_ENABLED_PROVIDERS,
			callback: async (siteId: Local.Site['id']) => {
				try {
					return createIpcAsyncResult(await getEnabledBackupProviders(), siteId);
				} catch (error) {
					return createIpcAsyncError(error, siteId);
				}
			},
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
				 * @todo filtering the query directly b3y passing it a repo_id seems to be broken atm.
				 * Fix this up once the Hub side is working
				 */
				const snapshots = await getBackupSnapshots();
				// Hub returns the "config" data as a single string, so we need to convert back to object
				snapshots.forEach((snapshot) => {
					snapshot.configObject = JSON.parse(snapshot.config);
				});
				return snapshots.filter(({ repoID }) => repoID === backupRepo.id);
			},
		},
		{
			channel: IPCASYNC_EVENTS.RESTORE_BACKUP,
			callback: async (siteID: Site['id'], provider: Providers, snapshotID: string) => {
				const site = getSiteDataFromDisk(siteID);
				return restoreFromBackup({ site, provider, snapshotID });
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
}
