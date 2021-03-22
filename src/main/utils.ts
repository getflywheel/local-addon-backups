import { getServiceContainer, SiteData } from '@getflywheel/local/main';
import type { Site, GenericObject, Providers } from '../types';
import { HubOAuthProviders } from '../types';

const serviceContainer = getServiceContainer().cradle;

/**
 * Converts a snake case string to a camelCase string
 *
 * @param inputStr
 */
export const snakeToCamelCase = (inputStr: string) => inputStr.split('_').map((s, i) => {
	const lowerCase = s.toLowerCase();
	if (i === 0) {
		return lowerCase;
	}

	return `${lowerCase.substring(0, 1).toUpperCase()}${lowerCase.substring(1)}`;
}).join('');

/**
 * Takes an object and returns a new object with any snake case keys converted to camelCase
 *
 * @param obj
 */
export const convertKeysFromSnakeToCamelCase = <OutPut>(obj: GenericObject) => Object.entries(obj).reduce((acc, [key, value]) => {
	acc[snakeToCamelCase(key)] = value;
	return acc;
}, {} as OutPut);

/**
 * Helper to read site data from disk
 *
 * @param id
 */
export const getSiteDataFromDisk = (id: Site['id']) => {
	const sites = serviceContainer.userData.get('sites');
	return sites[id];
};

export const providerToHubProvider = (provider: Providers) => {
	switch (provider) {
		case 'drive':
			return HubOAuthProviders.Google;
		default:
			return HubOAuthProviders.Dropbox;
	}
};

/**
 * The Site type exported from @getflywheel/local does not have all of the fields on it that this needs
 * This provides an easy place to typecast and update that site object while still satisfying the TS compiler
 *
 * @param id
 * @param sitePartial
 */
export const updateSite = (id: Site['id'], sitePartial: Partial<Site>) => SiteData.updateSite(id, sitePartial);

/**
 * Convert a camel case string to single space separated words
 *
 * @param str
 * @returns
 */
export const camelCaseToSentence = (str: string) => str.replace(/([A-Z])/g, ' $1').toLowerCase();

/**
 * Replace a tilde at the start of a string (unix home dir shorthand) with any other base directory
 *
 * @param p or
 * @param tmpDir
 * @returns
 */
export const expandTildeToDir = (originalPathj: string, baseDir: string) => {
	if (typeof originalPathj !== 'string') {
		return originalPathj;
	}

	return originalPathj.replace(/^~\//, `${baseDir}/`).replace(/^~\\/, `${baseDir}\\`);
};
