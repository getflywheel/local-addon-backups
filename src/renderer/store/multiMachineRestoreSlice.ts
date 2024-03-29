import {
	createSlice, SerializedError, createEntityAdapter, createSelector,
} from '@reduxjs/toolkit';
import type { BackupSite, BackupSnapshot, HubProviderRecord } from '../../types';
import {
	getSitesList,
	getProvidersList,
	getSnapshotList,
	setMultiMachineProviderAndUpdateSnapshots,
	requestSubsequentSnapshots,
} from './multiMachineThunks';
import { AppState } from './store';


const snapshotsEntityAdapter = createEntityAdapter<BackupSnapshot>({
	selectId: (snapshot) => snapshot.id,
	// regardless of the order received, do this additional sort by descending created date/time
	sortComparer: (a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
});

export const MULTI_MACHINE_SNAPSHOTS_HAS_MORE = 'paging_has_more_multi_machine_snapshots';

/**
 * State for multi-machine backup workflow.
 */
export const multiMachineRestoreSlice = createSlice({
	name: 'multiMachineRestore',
	initialState: {
		// sites
		backupSites: [] as BackupSite[],
		selectedSite: null as BackupSite,
		newSiteName: '',

		// snapshots
		backupSnapshots: snapshotsEntityAdapter.getInitialState(),
		selectedSnapshot: null as BackupSnapshot,
		isLoadingMoreSnapshots: false,
		currentSnapshotsPage: null as number,
		totalSnapshotsPages: null as number,

		//providers
		backupProviders: [] as HubProviderRecord[],
		individualSiteRepoProviders: [] as HubProviderRecord[],
		selectedProvider: null as HubProviderRecord,
		providerIsErrored: false,

		// general
		isLoading: false,
		isErrored: false,
		activeError: null as SerializedError,
	},
	reducers: {
		resetMultiMachineRestoreState: (state) => {
			state.backupSites = [];
			state.selectedSite = null as BackupSite;
			state.newSiteName = '';
			state.selectedSnapshot = null as BackupSnapshot;
			state.isErrored = false;
			state.activeError = null as SerializedError;
			return state;
		},
		setSelectedSite: (state, action) => {
			state.selectedSite = action.payload;
			// Set default sitename to sitename-backup.
			if (action.payload) {
				state.newSiteName = `${action.payload.name}-backup`;
			}
			return state;
		},
		setNewSiteName: (state, action) => {
			state.newSiteName = action.payload;
			return state;
		},
		setSelectedSnapshot: (state, action) => {
			state.selectedSnapshot = action.payload;
			return state;
		},
		setSelectedProvider: (state, action) => {
			state.selectedSnapshot = action.payload;
			return state;
		},
		setIsErrored: (state, action) => {
			state.isErrored = action.payload;
			return state;
		},
		setProviderIsErrored: (state, action) => {
			state.providerIsErrored = action.payload;
			return state;
		},
		setActiveError: (state, action) => {
			state.activeError = action.payload;
			return state;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(getSitesList.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getSitesList.fulfilled, (state, action) => {
				state.isLoading = false;
				state.backupSites = action.payload.allSites;
			})
			.addCase(getSitesList.rejected, (state, action) => {
				state.isLoading = false;
				state.isErrored = true;
				state.activeError = action.payload;
			})
			// getProviderList cases
			.addCase(getProvidersList.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getProvidersList.fulfilled, (state, action) => {
				state.isLoading = false;
				state.backupProviders = action.payload.availableProviders;
			})
			.addCase(getProvidersList.rejected, (state, action) => {
				state.isLoading = false;
				state.providerIsErrored = true;
				state.activeError = action.payload;
			})
			// getSnapshotList cases
			.addCase(getSnapshotList.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getSnapshotList.fulfilled, (state, action) => {
				state.isLoading = false;
				// state.backupSnapshots = action.payload.snapshots.snapshots;
				snapshotsEntityAdapter.setAll(state.backupSnapshots, action.payload.snapshots.snapshots);
				state.individualSiteRepoProviders = action.payload.individualSiteProviders;
				state.selectedProvider = action.payload.individualSiteProviders[0];
				state.currentSnapshotsPage = action.payload.snapshots.pagination.currentPage;
				state.totalSnapshotsPages = action.payload.snapshots.pagination.lastPage;
			})
			.addCase(getSnapshotList.rejected, (state, action) => {
				state.isLoading = false;
				state.isErrored = true;
				state.activeError = action.payload;
			})
			// setMultiMachineProviderAndUpdateSnapshots cases
			.addCase(setMultiMachineProviderAndUpdateSnapshots.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(setMultiMachineProviderAndUpdateSnapshots.fulfilled, (state, action) => {
				state.isLoading = false;
				snapshotsEntityAdapter.setAll(state.backupSnapshots, action.payload.snapshots.snapshots);
				state.selectedSnapshot = null;
				state.selectedProvider = action.payload.provider;
				state.currentSnapshotsPage = action.payload.snapshots.pagination.currentPage;
				state.totalSnapshotsPages = action.payload.snapshots.pagination.lastPage;
			})
			.addCase(setMultiMachineProviderAndUpdateSnapshots.rejected, (state, action) => {
				state.isLoading = false;
				state.isErrored = true;
				state.activeError = action.payload;
			})
			// requestSubsequentSnapshots cases
			.addCase(requestSubsequentSnapshots.pending, (state) => {
				state.isLoadingMoreSnapshots = true;
			})
			.addCase(requestSubsequentSnapshots.fulfilled, (state, action) => {
				snapshotsEntityAdapter.upsertMany(state.backupSnapshots, action.payload.snapshots.snapshots);
				state.isLoadingMoreSnapshots = false;
				state.currentSnapshotsPage = action.payload.snapshots.pagination.currentPage;
				state.totalSnapshotsPages = action.payload.snapshots.pagination.lastPage;
			})
			.addCase(requestSubsequentSnapshots.rejected, (state) => {
				state.isLoadingMoreSnapshots = false;
			});
	},
});

const snapshotsEntityAdapterSnapshots = snapshotsEntityAdapter.getSelectors<AppState>(
	(state) => state.multiMachineRestore.backupSnapshots,
);

export const selectMultiMachineActiveSiteSnapshots = createSelector(
	[
		snapshotsEntityAdapterSnapshots.selectAll,
		(state: AppState) => state.multiMachineRestore.currentSnapshotsPage,
		(state: AppState) => state.multiMachineRestore.totalSnapshotsPages,
		(state: AppState) => state.multiMachineRestore.isLoading,
		(state: AppState) => state.multiMachineRestore.isLoadingMoreSnapshots,
	],
	(
		selectAll,
		currentSnapshotsPage,
		totalSnapshotsPages,
		isLoading,
		isLoadingMoreSnapshots,
	) => {
		const hasMore = currentSnapshotsPage < totalSnapshotsPages;

		// if hub returns multiple pages of snapshots
		// append a blank snapshot object with a unique hash to indicate this fact
		return [
			...selectAll,
			...(hasMore && !isLoading && !isLoadingMoreSnapshots
				? [{
					hash: MULTI_MACHINE_SNAPSHOTS_HAS_MORE,
					id: -1,
					repoID: -1,
				} as BackupSnapshot]
				: []
			),
		];
	},
);
