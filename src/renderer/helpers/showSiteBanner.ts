import * as Local from '@getflywheel/local';
import * as LocalRenderer from '@getflywheel/local/renderer';

export function showSiteBanner (banner: Local.SiteBanner) {
	if (!banner.siteID) {
		return;
	}

	LocalRenderer.sendIPCEvent('showSiteBanner', banner);
}
