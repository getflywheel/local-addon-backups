import { createSelector } from '@reduxjs/toolkit';
import { State } from './store';

/**
 * The selected/active provider derived from the current active site and known providers.
 */
const selectActiveProvider = createSelector(
	[
		(state: State) => state.activeSite.id,
		(state: State) => state.providers,
	],
	(activeSiteID, { activeProviders, enabledProviders }) => {
		if (!activeSiteID || !enabledProviders || !activeProviders) {
			return null;
		}

		const activeSiteProviderId = activeProviders[activeSiteID];

		return enabledProviders.find((provider) => provider.id === activeSiteProviderId);
	},
);

const getIsBackupRunning = createSelector(
	(state: State) => state.backupInProgress,
	({ backupRunning }) => backupRunning,
);

/**
 * Organized export of available selectors.
 */
export const selectors = {
	selectActiveProvider,
};
