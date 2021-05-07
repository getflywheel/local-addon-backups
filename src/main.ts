import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import type { HubOAuthProviders, Providers, Site } from './types';
import {
	getEnabledBackupProviders,
	getBackupReposByProviderID,
	getBackupSnapshotsByRepo,
} from './main/hubQueries';
import { createBackup } from './main/services/backupService';
import { restoreFromBackup } from './main/services/restoreService';
import { getSiteDataFromDisk } from './main/utils';
import { cloneFromBackup } from './main/services/cloneFromBackupService';
import { IPCASYNC_EVENTS } from './constants';
import { createIpcAsyncError, createIpcAsyncResult } from './helpers/createIpcAsyncResponse';
import { getServiceContainer } from '@getflywheel/local/main';

const serviceContainer = getServiceContainer().cradle;
const { localLogger } = serviceContainer;

const logger = localLogger.child({
	thread: 'main',
	class: 'backup-add-on.main.ts',
});

/**
 * The Main thread of IPC listeners from Renderer.
 * This is where all main thread ipc responses get normalized to use a consistent IpcAsyncResponse result.
 */
export default function (): void {
	const listenerConfigs = [
		{
			channel: IPCASYNC_EVENTS.GET_ENABLED_PROVIDERS,
			callback: async (siteId: Local.Site['id']) => {
				try {
					return createIpcAsyncResult(
						await getEnabledBackupProviders(),
						siteId,
					);
				} catch (error) {
					logger.error(`Error - IPCASYNC_EVENTS.CLONE_BACKUP: ${error.toString()}`);
					return createIpcAsyncError(error, siteId);
				}
			},
		},
		{
			channel: IPCASYNC_EVENTS.START_BACKUP,
			callback: async (siteId: Local.Site['id'], provider: Providers, description: string) => {
				try {
					const siteJSON = LocalMain.SiteData.getSite(siteId);
					const site = new Local.Site(siteJSON);
					return createIpcAsyncResult(
						await createBackup(site, provider, description),
						siteId,
					);
				} catch (error) {
					logger.error(`Error - IPCASYNC_EVENTS.IPCASYNC_EVENTS: ${error.toString()}`);
					return createIpcAsyncError(error, siteId);
				}
			},
		},
		{
			channel: IPCASYNC_EVENTS.GET_SITE_PROVIDER_BACKUPS,
			callback: async (siteId: Site['id'], provider: HubOAuthProviders, pageOffset: number) => {
				try {
					const site = getSiteDataFromDisk(siteId);
					const backupRepo = (await getBackupReposByProviderID(provider)).find(
						({ hash }) => hash === site.localBackupRepoID,
					);

					if (!backupRepo) {
						return [];
					}

					// todo - crum: change limit to reasonable number
					const result = await getBackupSnapshotsByRepo(backupRepo.id, 2, pageOffset);
					// Hub returns the "config" data as a single string, so we need to convert back to object
					result.snapshots.forEach((snapshot) => {
						snapshot.configObject = JSON.parse(snapshot.config);
						snapshot.siteId = siteId;
					});

					return createIpcAsyncResult(
						result,
						siteId,
					);
				} catch (error) {
					logger.error(`Error - IPCASYNC_EVENTS.GET_SITE_PROVIDER_BACKUPS: ${error.toString()}`);
					return createIpcAsyncError(error, siteId);
				}
			},
		},
		{
			channel: IPCASYNC_EVENTS.RESTORE_BACKUP,
			callback: async (siteId: Site['id'], provider: Providers, snapshotID: string) => {
				try {
					const site = getSiteDataFromDisk(siteId);
					return createIpcAsyncResult(
						await restoreFromBackup({ site, provider, snapshotID }),
						siteId,
					);
				} catch (error) {
					logger.error(`Error - IPCASYNC_EVENTS.RESTORE_BACKUP: ${error.toString()}`);
					return createIpcAsyncError(error, siteId);
				}
			},
		},
		{
			channel: IPCASYNC_EVENTS.CLONE_BACKUP,
			callback: async (baseSite: Local.Site, newSiteName: string, provider: Providers, snapshotHash: string) => {
				try {
					return createIpcAsyncResult(
						await cloneFromBackup({ baseSite, newSiteName, provider, snapshotHash }),
						baseSite.id,
					);
				} catch (error) {
					logger.error(`Error - IPCASYNC_EVENTS.CLONE_BACKUP: ${error.toString()}`);
					return createIpcAsyncError(error, baseSite.id);
				}
			},
		},
	];

	listenerConfigs.forEach(({ channel, callback }) => {
		LocalMain.addIpcAsyncListener(channel, callback);
	});
}
