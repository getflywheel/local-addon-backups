import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { Providers } from './types';
import { backupSite, initRepo, listSnapshots, listRepos, arbitraryCmd } from './main/cli';
import { getBackupCredentials } from './main/hubQueries';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	try {
		LocalMain.addIpcAsyncListener('start-site-backup', async (siteId: Local.Site['id'], provider: Providers) => {
			const site = LocalMain.SiteData.getSite(siteId);

			// console.log('provider....', provider);

			await initRepo(site, provider);

			console.log('repo initialized........');

			// await backupSite(site, provider);
		});

		LocalMain.addIpcAsyncListener('list-site-snapshots', async (siteId: Local.Site['id'], provider: Providers) => {
			const site = LocalMain.SiteData.getSite(siteId);

			const snapshots = await listSnapshots(site, provider);

			console.log(snapshots);

			return snapshots;
		});
	} catch (err) {
		console.error('Generic catch block', err);
	}

	LocalMain.addIpcAsyncListener('list-repos', async (siteId: Local.Site['id'], provider: Providers) => {
		const repos = await listRepos(provider);
		console.log(repos);
		return repos;
	});

	LocalMain.addIpcAsyncListener('get-hub-credentials', async (provider: Providers) => {
		// const credentials = await getBackupCredentials(provider);
		// console.log('credentials....', credentials);
		// return credentials;
	});

	LocalMain.addIpcAsyncListener('do-arbitrary-shit', async (siteId: Local.Site['id'], provider: Providers, bin: string, cmd: string) => {
		const site = LocalMain.SiteData.getSite(siteId);


		return await arbitraryCmd(bin, cmd, provider);
	});
}
