import { createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';
import type { EntityState } from '@reduxjs/toolkit';
import type { BackupSnapshot, PaginationInfo } from '../../types';
import { clearSnapshotsForSite, getSnapshotsForActiveSiteProviderHub } from './thunks';
import type { AppState } from './store';
import { selectors } from './selectors';

type SitePaging = {
	hasLoadingError: boolean;
	hasMore: boolean | null;
	isLoading: boolean;
	offset: number;
}
type SitesLookupPaging = {[siteId: string]: SitePaging};

/**
 * Normalized list of all snapshots for all sites using the entity adapter pattern.
 */
const snapshotsEntityAdapter = createEntityAdapter<BackupSnapshot>({
	selectId: (snapshot) => snapshot.id,
	// regardless of the order received, do this additional sort by descending updated date/time
	sortComparer: (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
});

export const TABLEROW_HASH_IS_SPECIAL_PAGING_HAS_MORE = 'placeholder-paging-hasMore';
export const TABLEROW_HASH_IS_SPECIAL_PAGING_IS_LOADING = 'placeholder-paging-isLoading';

/**
 * Removes all snapshots records within the entity adapter for the given site.
 * @param siteId
 * @param items
 */
function purgeSnapshotsForSite (siteId: string | null, items: EntityState<BackupSnapshot>) {
	if (siteId) {
		// purge existing snapshots for this site
		snapshotsEntityAdapter.removeMany(
			items,
			items.ids.filter((snapshotId) => items.entities[snapshotId]?.siteId === siteId),
		);
	}
}

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
		builder.addCase(clearSnapshotsForSite.fulfilled, (state, { payload }) => {
			purgeSnapshotsForSite(payload, state.items);
		});
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
				purgeSnapshotsForSite(siteId, state.items);
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
		selectors.selectActiveProvider,
	],
	(
		activeSite,
		director,
		selectActiveSiteSnapshots,
		pagingBySite,
		activeSiteProvider,
	) => {
		const paging = pagingBySite[activeSite.id];

		return [
			// prepend placeholder snapshot only if the backup is for the active site
			...(director.backupSnapshotPlaceholder
				&& activeSite.id === director.backupSiteId
				&& activeSiteProvider?.id === director.backupProviderId
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
