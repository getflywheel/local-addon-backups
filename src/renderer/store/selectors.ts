import { createSelector } from '@reduxjs/toolkit';
import { AppState, store } from './store';

/**
 * The selected/active provider derived from the current active site and known providers.
 */
const selectActiveProvider = createSelector(
	[
		(state: AppState) => state.activeSite.id,
		(state: AppState) => state.providers,
	],
	(activeSiteID, { activeProviders, enabledProviders }) => {
		if (!activeSiteID || !enabledProviders || !activeProviders) {
			return null;
		}

		const activeSiteProviderId = activeProviders[activeSiteID];

		return enabledProviders?.find((provider) => provider.id === activeSiteProviderId);
	},
);

const selectMultiMachineSliceState = createSelector(
	() => store.getState(),
	({ multiMachineRestore }) => multiMachineRestore,
);

/**
 * Organized export of available selectors.
 */
export const selectors = {
	selectActiveProvider,
	selectMultiMachineSliceState,
};
