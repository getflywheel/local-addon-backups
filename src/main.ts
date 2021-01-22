import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';
import { test } from './main/cli';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const { notifier, electron } = context;

	test();

	electron.ipcMain.on('start-site-backup', async (event, siteId: Local.Site['id']) => {
		const site = LocalMain.SiteData.getSite(siteId);

		notifier.notify({
			title: 'Test',
			message: 'Start backup for ' + site.id,
		});
	});
}
