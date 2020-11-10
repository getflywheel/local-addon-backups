import * as Local from '@getflywheel/local';
import * as LocalMain from '@getflywheel/local/main';

export default function(context) {
    const { notifier, electron } : { notifier: any, electron: typeof Electron } = context;

    electron.ipcMain.on('start-site-backup', async (event, siteId: Local.Site['id']) => {

        const site = LocalMain.SiteData.getSite(siteId);

        notifier.notify({
            title: 'Test',
            message: 'Start backup for ' + siteId,
        });
    });
}

// import * as LocalMain from '@getflywheel/local/main';

// export default function (context) {
// 	const { electron } = context;
// 	const { ipcMain } = electron;

// 	LocalMain.addIpcAsyncListener('get-random-count', async () => {
// 		return Math.floor(Math.random() * 100);
// 	});

// 	ipcMain.on('save-count', async (event, siteId, count) => {
// 		LocalMain.sendIPCEvent('instructions');
// 		LocalMain.getServiceContainer().cradle.localLogger.log('info', `Saving count ${count} for site ${siteId}.`);
// 		LocalMain.SiteData.updateSite(siteId, {
// 			id: siteId,
// 			count,
// 		});
// 	});
// }
