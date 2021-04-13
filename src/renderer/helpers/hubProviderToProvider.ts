import { HubOAuthProviders, HubProviderRecord, Providers } from '../../types';

/**
* Hub/Rsync use slightly different naming conventions for each provider. This maps from the Hub
* provided values to those expected by Rsync
*
* @param hubProvider
*/
export const hubProviderToProvider = (hubProvider: HubOAuthProviders) => {
	if (hubProvider === HubOAuthProviders.Google) {
	   return Providers.Drive;
	}

	if (hubProvider === HubOAuthProviders.Dropbox) {
	   return Providers.Dropbox;
	}

	return null;
};

/**
* This maps from HubProviderRecord to Providers
*
* @param hubProvider
*/
export const hubProviderRecordToProvider = (hubProvider: HubProviderRecord) => {

	if (hubProvider.id === HubOAuthProviders.Google) {
		return Providers.Drive;
	}

	if (hubProvider.id === HubOAuthProviders.Dropbox) {
		return Providers.Dropbox;
	}

	return null;
};
