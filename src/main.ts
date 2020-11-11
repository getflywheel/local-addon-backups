import * as Local from '@getflywheel/local';
import * as local_main from '@getflywheel/local/main';

export default function(context) {
    const { notifier, electron } : { notifier: any, electron: typeof Electron } = context;

    electron.ipcMain.on('start-site-backup', async (event, siteId: Local.Site['id']) => {

		const site = local_main.SiteData.getSite(siteId);

        notifier.notify({
            title: 'Test',
            message: 'Start backup for ' + siteId,
        });
    });
}
