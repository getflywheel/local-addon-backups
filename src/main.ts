import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import type { HubOAuthProviders, Providers, Site } from './types';
import { listRepos } from './main/cli';
import { getEnabledBackupProviders, getBackupReposByProviderID, getBackupSnapshots } from './main/hubQueries';
import { createBackup } from './main/services/backupService';
import { getSiteDataFromDisk } from './main/utils';


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const listenerConfigs = [
		{
			channel: 'backups:enabled-providers',
			callback: async () => await getEnabledBackupProviders(),
		},
		{
			channel: 'backups:backup-site',
			callback: async (siteId: Local.Site['id'], provider: Providers) => {
				const site = LocalMain.SiteData.getSite(siteId);

				return await createBackup(site, provider);
			},
		},
		{
			channel: 'backups:provider-snapshots',
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
	];

	try {
		listenerConfigs.forEach(({ channel, callback }) => {
			LocalMain.addIpcAsyncListener(channel, callback);
		});


		LocalMain.addIpcAsyncListener('start-site-backup', async (siteId: Local.Site['id'], provider: Providers) => {
			const site = LocalMain.SiteData.getSite(siteId);
		});

		LocalMain.addIpcAsyncListener('list-site-snapshots', async (siteId: Local.Site['id'], provider: Providers) => {
			const site = LocalMain.SiteData.getSite(siteId);
		});
	} catch (err) {
		console.error('Generic catch block', err);
	}

	LocalMain.addIpcAsyncListener('list-repos', async (siteId: Local.Site['id'], provider: Providers) => await listRepos(provider));
}
