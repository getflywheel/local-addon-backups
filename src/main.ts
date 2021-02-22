import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { Providers } from './types';
import { listRepos } from './main/cli';
import { getEnabledBackupProviders } from './main/hubQueries';
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
