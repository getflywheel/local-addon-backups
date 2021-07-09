import { getServiceContainer, formatSiteNicename } from '@getflywheel/local/main';

const serviceContainer = getServiceContainer().cradle;
const {
	siteData,
} = serviceContainer;

export const checkForDuplicateSiteName = async (siteName: string) => {
	const coolSitedata = siteData.getSites();

	const formattedSiteName = formatSiteNicename(siteName);
	const newSiteDomain = `${formattedSiteName}.local`;

	let matchesExistingDomains = false;
	let matchesExistingNames = false;

	for (const site of Object.values(coolSitedata)) {
		if (site.domain === newSiteDomain) {
			matchesExistingDomains = true;
		}
		if (site.name === siteName) {
			matchesExistingNames = true;
		}
	}

	if (matchesExistingNames || matchesExistingDomains) {
		return true;
	}

	return false;
};
