import { createSelector } from '@reduxjs/toolkit';
import state from '../../main/services/state';
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

const selectAllBackupSites = createSelector(
	() => store.getState(),
	({ multiMachineRestore }) => multiMachineRestore.backupSites,
);

const selectEnabledProvider = createSelector(
	() => store.getState(),
	({ multiMachineRestore }) => multiMachineRestore.selectedProvider,
);

const selectBackupSite = createSelector(
	() => store.getState(),
	({ multiMachineRestore }) => multiMachineRestore.selectedSite,
);

const selectAllSnapshots = createSelector(
	() => store.getState(),
	({ multiMachineRestore }) => multiMachineRestore.backupSnapshots,
);

const selectActiveSnapshot = createSelector(
	() => store.getState(),
	({ multiMachineRestore }) => multiMachineRestore.selectedSnapshot,
);

/**
 * Organized export of available selectors.
 */
export const selectors = {
	selectActiveProvider,
	selectAllBackupSites,
	selectEnabledProvider,
	selectBackupSite,
	selectAllSnapshots,
	selectActiveSnapshot,
};
