import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { Providers } from './types';
import { backupSite, initRepo, listSnapshots } from './main/cli';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const { notifier, electron } = context;
	try {
		LocalMain.addIpcAsyncListener('start-site-backup', async (siteId: Local.Site['id'], provider: Providers) => {
			const site = LocalMain.SiteData.getSite(siteId);

			notifier.notify({
				title: 'Test',
				message: 'Start backup for ' + site.id,
			});

			console.log('provider....', provider);

			await initRepo(site, provider);

			console.log('repo initialized........');

			await backupSite(site, provider);
		});

		LocalMain.addIpcAsyncListener('list-site-snapshots', async (siteId: Local.Site['id'], provider: Providers) => {
			const site = LocalMain.SiteData.getSite(siteId);

			const snapshots = await listSnapshots(site, provider);

			console.log('snapshots.....', snapshots);

			return snapshots;
		});
	} catch (err) {
		console.error('Generic catch block', err);
	}
}
