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

/**
 * List of snapshots prepended with any currently backing up details.
 */
const selectSnapshotsPlusBackingupPlaceholder = createSelector(
	[
		(state: State) => state.activeSite.snapshots,
		(state: State) => state.activeSite.backingUpMeta,
	],
	(snapshots, backingUpMeta) => {
		if (backingUpMeta) {
			return ([
				backingUpMeta.snapshot,
				...snapshots ?? [],
			]);
		}

		return snapshots ?? [];
	},
);

/**
 * Organized export of available selectors.
 */
export const selectors = {
	selectActiveProvider,
	selectSnapshotsPlusBackingupPlaceholder,
};
