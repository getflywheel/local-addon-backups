import { ipcAsync } from '@getflywheel/local/renderer';
import { URLS } from '../../constants';

/**
 * Light convenience wrapper around ipcAsync to launch a web browser in the default browser as configured by Local
 *
 * @param url
 */
export const launchBrowser = (url: string) => ipcAsync(
	'browserService:launch',
	url,
);

export const launchBrowserToHubBackups = () => launchBrowser(`${URLS.LOCAL_HUB}/addons/cloud-backups`);
export const launchBrowserToHubLogin = () => launchBrowser(`${URLS.LOCAL_HUB}/login`);
