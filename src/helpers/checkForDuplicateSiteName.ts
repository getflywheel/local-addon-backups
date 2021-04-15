import { getServiceContainer } from '@getflywheel/local/main';

const serviceContainer = getServiceContainer().cradle;
const {
	siteData,
} = serviceContainer;

export const checkForDuplicateSiteName = async (siteName: string, formattedSiteName: string) => {
	const siteDomains = [];
	const siteNames = [];
	const coolSitedata = siteData.getSites();
	const newSiteDomain = `${formattedSiteName}.local`;

	for (const site of Object.values(coolSitedata)) {
		siteDomains.push(site.domain);
		siteNames.push(site.name);
	}

	let matchesExistingDomains = false;
	let matchesExistingNames = false;

	siteDomains.forEach((domain) => {
		if (domain === newSiteDomain) {
			matchesExistingDomains = true;
		}
	});

	siteNames.forEach((name) => {
		if (name === siteName) {
			matchesExistingNames = true;
		}
	});

	if (matchesExistingNames || matchesExistingDomains) {
		return true;
	}

	return false;
};
