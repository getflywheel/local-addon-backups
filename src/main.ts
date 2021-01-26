import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { initRepo } from './main/cli';

const serviceContainer = LocalMain.getServiceContainer().cradle;
/* @ts-ignore */
const { localHubAPI } = serviceContainer;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const { notifier, electron } = context;


	electron.ipcMain.on('start-site-backup', async (event, siteId: Local.Site['id']) => {
		const site = LocalMain.SiteData.getSite(siteId);

		initRepo(site);

		notifier.notify({
			title: 'Test',
			message: 'Start backup for ' + site.id,
		});
	});
}
