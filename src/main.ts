import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { Providers } from './types';
import { backupSite, initRepo, listSnapshots, listRepos } from './main/cli';


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	try {
		LocalMain.addIpcAsyncListener('start-site-backup', async (siteId: Local.Site['id'], provider: Providers) => {
			const site = LocalMain.SiteData.getSite(siteId);
			await initRepo(site, provider);
			await backupSite(site, provider);
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
