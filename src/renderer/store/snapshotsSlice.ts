import { createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import type { BackupSnapshot } from '../../types';
import { getSnapshotsForActiveSiteProviderHub } from './thunks';
import type { AppState } from './store';

const snapshotsEntityAdapter = createEntityAdapter<BackupSnapshot>({
	// todo - crum: need to confirm that `id` is unique across all sites otherwise it can't be the id/key here
	selectId: (snapshot) => snapshot.id,
	// regardless of the order received, do this additional sort by descending updated date/time
	sortComparer: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
});

type IdsLookup = {[snapshotId: string]: boolean};
type IdsBySite = {[siteId: string]: IdsLookup};

/**
 * State for various site's lists of backup snapshots.
 */
export const snapshotsSlice = createSlice({
	name: 'snapshotsSlice',
	initialState: {
		/** entity of all snapshots across all sites **/
		items: snapshotsEntityAdapter.getInitialState(),
		/** Lookup of snapshot ids by site id (this is necessary b/c snapshot data doesn't include siteId **/
		idsBySite: {} as IdsBySite,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(getSnapshotsForActiveSiteProviderHub.fulfilled, (state, { payload }) => {
			snapshotsEntityAdapter.upsertMany(state.items, payload.result);

			// take the original snapshots result and distill it down to a lookup table of snapshot ids
			// todo - crum: need to change to allow for paging
			const siteSnapshots: IdsLookup = payload.result.reduce(
				(prev, snapshot) => {
					prev[snapshot.id] = true;
					return prev;
				},
				{} as IdsLookup,
			);

			state.idsBySite[payload.siteId] = siteSnapshots;
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.pending, (state) => {

		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.rejected, (state) => {

		});
	},
});

const snapshotsEntityAdapterSelectors = snapshotsEntityAdapter.getSelectors<AppState>(
	(state) => state.snapshots.items,
);

const selectActiveSiteSnapshots = createSelector(
	[
		(state: AppState) => state.activeSite,
		(state: AppState) => state.snapshots,
		snapshotsEntityAdapterSelectors.selectAll,
	],
	(activeSite, snapshots, selectAll) => {
		if (!activeSite.id) {
			return [];
		}

		// get hashmap of ids for only the active site
		const activeSiteSnapshots = snapshots.idsBySite[activeSite.id];
		// filter to include only the active site's backups
		return selectAll.filter((snapshot) => activeSiteSnapshots?.[snapshot.id]);
	},
);

/**
 * List of snapshots prepended with placeholder prepending if currently backup up.
 */
export const selectSnapshotsForActiveSitePlusExtra = createSelector(
	[
		(state: AppState) => state.activeSite,
		(state: AppState) => state.director,
		selectActiveSiteSnapshots,
	],
	(activeSite, director, selectActiveSiteSnapshots) => {
		// prepend placeholder snapshot only if the backup is for the active site
		if (director.backupSnapshotPlaceholder && activeSite.id === director.backupSiteId) {
			return ([
				director.backupSnapshotPlaceholder,
				...selectActiveSiteSnapshots ?? [],
			]);
		}

		return selectActiveSiteSnapshots ?? [];
	},
);
