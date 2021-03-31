import {
	createSelector,
} from '@reduxjs/toolkit';
import { State, store } from './store';
import type { HubProviderRecord } from '../../types';

const activeSiteID = (state: State) => state.activeSiteID;

/**
 * The last selected/active provided derived from the current active site and providers.
 */
const activeSiteProvider = createSelector(
	[
		(state: State) => state.activeSiteID,
		(state: State) => state.providers,
	],
	(activeSiteID, { activeProviders, enabledProviders }) => {
		console.log('!! activeSiteID', activeSiteID, '&enabledProviders', enabledProviders, '&activeProviders', activeProviders);
		if (!activeSiteID || !enabledProviders || !activeProviders) {
			return null;
		}

		console.log('...enabledProviders', enabledProviders);

		const activeSiteProviderId = activeProviders[activeSiteID];

		return enabledProviders.find((provider) => provider.id === activeSiteProviderId);
	},
);

/**
 * Organized export of available selectors.
 */
export const selectors = {
	activeSiteID: (): string => activeSiteID(store.getState()),
	activeSiteProvider,
};
