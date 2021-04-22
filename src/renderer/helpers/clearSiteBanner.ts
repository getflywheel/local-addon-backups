import * as LocalRenderer from '@getflywheel/local/renderer';

export function clearSiteBanner (siteID: string, id: string) {
	LocalRenderer.sendIPCEvent('clearSiteBanner', {
		siteID,
		id,
	});
}
