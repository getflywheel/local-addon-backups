import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import type { BackupSnapshot, HubOAuthProviders, Providers, Site, SiteMetaData, HubProviderRecord } from './types';
import {
	getEnabledBackupProviders,
	getBackupReposByProviderID,
	getBackupSnapshotsByRepo,
	updateBackupSnapshot,
	getBackupReposBySiteID,
	getBackupSitesByRepoID,
} from './main/hubQueries';
import { createBackup } from './main/services/backupService';
import { restoreFromBackup } from './main/services/restoreService';
import { getSiteDataFromDisk, hubProviderRecordToProvider } from './main/utils';
import { cloneFromBackup } from './main/services/cloneFromBackupService';
import { IPCASYNC_EVENTS, SHOW_CLOUD_BACKUPS_PROMO_BANNER } from './constants';
import { createIpcAsyncError, createIpcAsyncResult } from './helpers/createIpcAsyncResponse';
import { getServiceContainer } from '@getflywheel/local/main';
import { checkForDuplicateSiteName } from './helpers/checkForDuplicateSiteName';
import { shell } from 'electron';

const serviceContainer = getServiceContainer().cradle;
const {
	localLogger,
	changeSiteDomain,
	siteDatabase,
} = serviceContainer;

const logger = localLogger.child({
	thread: 'main',
	class: 'backup-add-on.main.ts',
});

const SNAPSHOTS_PAGE_LIMIT = 20;

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

					const result = await getBackupSnapshotsByRepo(backupRepo.id, SNAPSHOTS_PAGE_LIMIT, pageOffset);
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
		{
			channel: IPCASYNC_EVENTS.CHECK_FOR_DUPLICATE_NAME,
			callback: async (siteName: string) =>
				await checkForDuplicateSiteName(siteName),
		},
		{
			channel: IPCASYNC_EVENTS.EDIT_BACKUP_DESCRIPTION,
			callback: async ({ metaData, snapshot, siteId }: { metaData: SiteMetaData, snapshot: BackupSnapshot, siteId: string }) => {
				try {
					const result = await updateBackupSnapshot({
						metaData,
						snapshotID: snapshot.id,
						resticSnapshotHash: snapshot.hash,
						status: 'complete',
					});

					return createIpcAsyncResult(
						{ ...result, metaData },
						siteId,
					);
				} catch (error) {
					logger.error(`Error - IPCASYNC_EVENTS.EDIT_BACKUP_DESCRIPTON: ${error.toString()}`);
					return createIpcAsyncError(error, siteId);
				}
			},
		},
		{
			channel: IPCASYNC_EVENTS.GET_ALL_SITES,
			callback: async () => {
				// get available providers
				const providers = await getEnabledBackupProviders();

				// get all repos for each active provider
				const repos = await Promise.all(
					providers.map(async (provider: HubProviderRecord) =>
						await getBackupReposByProviderID(provider.id)));

				// flatten array
				const allRepos = repos.reduce((acc, curVal) => acc.concat(curVal), []);

				// get all sites for all repos
				const backupSites = await Promise.all(allRepos.map(async (repo) =>
					await getBackupSitesByRepoID(repo.hash)));

				// flatten array
				const allBackupSites = backupSites.reduce((acc, curVal) => acc.concat(curVal), []);

				return allBackupSites;
			},
		},
		{
			channel: IPCASYNC_EVENTS.GET_REPOS_BY_SITE_ID,
			callback: async (siteID: number) =>
				await getBackupReposBySiteID(siteID),
		},
		{
			channel: IPCASYNC_EVENTS.MULTI_MACHINE_GET_AVAILABLE_PROVIDERS,
			callback: async () => {
				try {
					return await getEnabledBackupProviders();
				} catch (error) {
					logger.error(`Error - IPCASYNC_EVENTS.MULTI_MACHINE_GET_AVAILABLE_PROVIDERS: ${error.toString()}`);
					return error;
				}

			},

		},
		{
			channel: IPCASYNC_EVENTS.GET_ALL_SNAPSHOTS,
			callback: async (siteUUID: string, provider: HubOAuthProviders, requestedPage?: number) => {
				const repos = await getBackupReposByProviderID(provider);

				const paginationNumber = requestedPage ?? 0;

				let repoID: number;

				// check all repos for the given provider
				// find the repo that matches the siteUUID
				// set the repoID so we can query snapshots by repo
				repos.forEach((repo) => {
					if (repo.hash === siteUUID) {
						repoID = repo.id;
					}
				});

				if (repoID) {
					const snapshots = await getBackupSnapshotsByRepo(repoID, SNAPSHOTS_PAGE_LIMIT, paginationNumber);

					// Hub returns the "config" data as a single string, so we need to convert back to object
					snapshots.snapshots.forEach((snapshot) => {
						snapshot.configObject = JSON.parse(snapshot.config);
					});

					return snapshots;
				}

				return [];
			},
		},
		{
			channel: IPCASYNC_EVENTS.SHOULD_LOAD_PROMO_BANNER,
			callback: async () => {
				try {
					return await LocalMain.UserData.get(SHOW_CLOUD_BACKUPS_PROMO_BANNER);
				} catch (e) {
					// noop
				}
			},
		},
		{
			channel: IPCASYNC_EVENTS.REMOVE_PROMO_BANNER,
			callback: async () => await LocalMain.UserData.remove(SHOW_CLOUD_BACKUPS_PROMO_BANNER),
		},
		{
			channel: IPCASYNC_EVENTS.OPEN_FILE_AT_PATH,
			callback: async (path: string) => await shell.openPath(path),
		},
	];

	listenerConfigs.forEach(({ channel, callback }) => {
		LocalMain.addIpcAsyncListener(channel, callback);
	});

	LocalMain.HooksMain.addFilter(
		'updateCloneSiteMetadata',
		(site: Site) => {
			delete site.localBackupRepoID;
			return site;
		},
	);

	// add cloudBackupMeta to the newly created site object before it's saved to disk
	LocalMain.HooksMain.addFilter(
		'modifyAddSiteObjectBeforeCreation',
		(site: Site, newSiteInfo) => {
			site.cloudBackupMeta = newSiteInfo.cloudBackupMeta;
			return site;
		},
	);

	// kick off backup restore after site creation is complete
	LocalMain.HooksMain.addAction(
		'siteAdded',
		async (site: Site) => {
			if (site.cloudBackupMeta && site.cloudBackupMeta.createdFromCloudBackup) {
				const { provider, snapshotID, repoID } = site.cloudBackupMeta;

				const providerID = hubProviderRecordToProvider(provider);

				await restoreFromBackup({ site, provider: providerID, snapshotID, repoID });

				const siteToSearchReplace = new Local.Site(site);

				LocalMain.sendIPCEvent('updateSiteStatus', site.id, 'provisioning');

				LocalMain.sendIPCEvent('updateSiteMessage', site.id, 'Changing site domain');

				await siteDatabase.waitForDB(siteToSearchReplace);

				await changeSiteDomain.changeSiteDomainToHost(siteToSearchReplace);
			}
		},
	);

	// adds a migration to show the cloud backup promo banner
	LocalMain.HooksMain.addFilter('migrations', (defaultMigrations) => ({
		...defaultMigrations,
		cloudBackupsAddon: {
			label: 'Cloud Backups Addon Migration',
			migrate: () => {
				LocalMain.UserData.set(SHOW_CLOUD_BACKUPS_PROMO_BANNER, { show: true });
			},
		},
	}));
}
