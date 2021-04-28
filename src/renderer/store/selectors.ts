import { createSelector } from '@reduxjs/toolkit';
import { AppState } from './store';

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

/**
 * List of snapshots prepended with any currently backing up details.
 */
const selectSnapshotsPlusBackingupPlaceholder = createSelector(
	[
		(state: AppState) => state.activeSite,
		(state: AppState) => state.director,
	],
	(activeSite, director) => {
		// prepend placeholder snapshot only if the backup is for the active site
		if (director.backupSnapshotPlaceholder && activeSite.id === director.backupSiteId) {
			return ([
				director.backupSnapshotPlaceholder,
				...activeSite.snapshots ?? [],
			]);
		}

		return activeSite.snapshots ?? [];
	},
);

/**
 * Organized export of available selectors.
 */
export const selectors = {
	selectActiveProvider,
	selectSnapshotsPlusBackingupPlaceholder,
};
