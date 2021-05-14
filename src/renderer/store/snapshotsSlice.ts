import { createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import type { BackupSnapshot, PaginationInfo } from '../../types';
import { getSnapshotsForActiveSiteProviderHub } from './thunks';
import type { AppState } from './store';

type SitePaging = {
	hasLoadingError: boolean;
	hasMore: boolean | null;
	isLoading: boolean;
	offset: number;
}
type SitesLookupPaging = {[siteId: string]: SitePaging};

const snapshotsEntityAdapter = createEntityAdapter<BackupSnapshot>({
	selectId: (snapshot) => snapshot.id,
	// regardless of the order received, do this additional sort by descending updated date/time
	sortComparer: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
});

export const TABLEROW_HASH_IS_SPECIAL_PAGING_HAS_MORE = 'placeholder-paging-hasMore';
export const TABLEROW_HASH_IS_SPECIAL_PAGING_IS_LOADING = 'placeholder-paging-isLoading';

/**
 * State for various site's lists of backup snapshots.
 */
export const snapshotsSlice = createSlice({
	name: 'snapshotsSlice',
	initialState: {
		/** entity of all snapshots across all sites **/
		items: snapshotsEntityAdapter.getInitialState(),
		/** paging details for each site **/
		pagingBySite: {} as SitesLookupPaging,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(getSnapshotsForActiveSiteProviderHub.fulfilled, (state, { payload, meta }) => {
			const { siteId } = meta.arg;
			const snapshots: BackupSnapshot[] | null = payload.result?.snapshots ?? [];
			const pagination: PaginationInfo | null = payload.result?.pagination;

			// add to ongoing list of all snapshots across all sites
			snapshotsEntityAdapter.upsertMany(state.items, snapshots);

			// update paging details
			state.pagingBySite[siteId] = {
				...state.pagingBySite[siteId],
				hasLoadingError: false,
				hasMore: pagination ? pagination.lastPage > pagination.currentPage : false,
				isLoading: false,
			};
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.pending, (state, { meta }) => {
			const { pageOffset, siteId } = meta.arg;

			// create new paging details
			state.pagingBySite[siteId] = {
				hasLoadingError: false,
				hasMore: null,
				isLoading: true,
				offset: pageOffset ?? 1,
			};

			// if paging index/offset is undefined or not the first page
			if (!pageOffset || pageOffset === 1) {
				// purge existing snapshots for this site
				snapshotsEntityAdapter.removeMany(
					state.items,
					state.items.ids.filter((snapshotId) => state.items.entities[snapshotId]?.siteId === siteId),
				);
			}
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.rejected, (state, { meta }) => {
			const { siteId } = meta.arg;

			// update paging details
			state.pagingBySite[siteId] = {
				...state.pagingBySite[siteId],
				hasLoadingError: true,
				isLoading: false,
			};
		});
	},
});

const snapshotsEntityAdapterSelectors = snapshotsEntityAdapter.getSelectors<AppState>(
	(state) => state.snapshots.items,
);

/**
 * The active site's paging details for their snapshots data.
 */
export const selectActivePagingDetails = createSelector(
	[
		(state: AppState) => state.activeSite,
		(state: AppState) => state.snapshots,
	],
	(activeSite, snapshots): SitePaging | null | undefined => {
		if (!activeSite.id) {
			return null;
		}

		return snapshots.pagingBySite[activeSite.id];
	},
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

		// filter to include only the active site's backups
		return selectAll.filter((snapshot) => snapshot.siteId === activeSite.id);
	},
);

/**
 * List of snapshots with optional prepended loading/error placeholder and paging row at the bottom.
 */
export const selectSnapshotsForActiveSitePlusExtra = createSelector(
	[
		(state: AppState) => state.activeSite,
		(state: AppState) => state.director,
		selectActiveSiteSnapshots,
		(state: AppState) => state.snapshots.pagingBySite,
	],
	(activeSite, director, selectActiveSiteSnapshots, pagingBySite) => {
		const paging = pagingBySite[activeSite.id];

		return [
			// prepend placeholder snapshot only if the backup is for the active site
			...(director.backupSnapshotPlaceholder && activeSite.id === director.backupSiteId
				? [director.backupSnapshotPlaceholder]
				: []
			),
			...selectActiveSiteSnapshots ?? [],
			...(paging && paging.hasMore && !paging.isLoading
				? [{
					hash: TABLEROW_HASH_IS_SPECIAL_PAGING_HAS_MORE,
					id: -1,
					repoID: -1,
				} as BackupSnapshot]
				: []
			),
			...(paging && paging.isLoading && paging.offset > 1
				? [{
					hash: TABLEROW_HASH_IS_SPECIAL_PAGING_IS_LOADING,
					id: -1,
					repoID: -1,
				} as BackupSnapshot]
				: []
			),
		];
	},
);
