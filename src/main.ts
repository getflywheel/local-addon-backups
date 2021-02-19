import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { Providers } from './types';
import { createSnapshot, initRepo, listSnapshots, listRepos } from './main/cli';
import { createBackupRepo, getEnabledBackupProviders } from './main/hubQueries';
import { createBackup } from './main/jobs';


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const listenerConfigs = [
		{
			channel: 'enabled-providers',
			callback: async () => await getEnabledBackupProviders(),
		},
		{
			channel: 'backups:backup-site',
			callback: async (siteId: Local.Site['id'], provider: Providers) => {
				const site = LocalMain.SiteData.getSite(siteId);

				createBackup(site, provider);

				return;

				await initRepo(site, provider);
				await createSnapshot(site, provider);
			},
		},
	];

	try {
		listenerConfigs.forEach(({ channel, callback }) => {
			LocalMain.addIpcAsyncListener(channel, callback);
		});


		LocalMain.addIpcAsyncListener('start-site-backup', async (siteId: Local.Site['id'], provider: Providers) => {
			const site = LocalMain.SiteData.getSite(siteId);
			await initRepo(site, provider);
			await createSnapshot(site, provider);
		});

		LocalMain.addIpcAsyncListener('list-site-snapshots', async (siteId: Local.Site['id'], provider: Providers) => {
			const site = LocalMain.SiteData.getSite(siteId);
			return await listSnapshots(site, provider);
		});
	} catch (err) {
		console.error('Generic catch block', err);
	}

	LocalMain.addIpcAsyncListener('list-repos', async (siteId: Local.Site['id'], provider: Providers) => await listRepos(provider));
}
