import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { backupSite, initRepo, listRepos } from './main/cli';
import { Providers } from './types';

const serviceContainer = LocalMain.getServiceContainer().cradle;
/* @ts-ignore */
const { localHubAPI } = serviceContainer;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const { notifier, electron } = context;

	electron.ipcMain.on('start-site-backup', async (event, siteId: Local.Site['id']) => {
		const site = LocalMain.SiteData.getSite(siteId);

		// console.log(await listRepos(Providers.Google));
		// await initRepo(site, Providers.Google);
		await backupSite(site, Providers.Google);

		notifier.notify({
			title: 'Test',
			message: 'Start backup for ' + site.id,
		});
	});
}
