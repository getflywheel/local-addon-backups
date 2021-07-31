import {
	createSlice, SerializedError, createEntityAdapter, createSelector,
} from '@reduxjs/toolkit';
import type { BackupSite, BackupSnapshot, HubProviderRecord } from '../../types';
import {
	getSitesList,
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


/**
 * State for multi-machine backup workflow.
 */
export const multiMachineRestoreSlice = createSlice({
	name: 'multiMachineRestore',
	initialState: {
		backupSites: [] as BackupSite[],
		backupSnapshots: snapshotsEntityAdapter.getInitialState(),
		backupProviders: [] as HubProviderRecord[],
		individualSiteRepoProviders: [] as HubProviderRecord[],
		selectedSite: null as BackupSite,
		selectedSnapshot: null as BackupSnapshot,
		selectedProvider: null as HubProviderRecord,
		isLoading: false,
		isErrored: false,
		activeError: null as SerializedError,
		currentSnapshotsPage: null as number,
		totalSnapshotsPages: null as number,
	},
	reducers: {
		setSelectedSite: (state, action) => {
			state.selectedSite = action.payload;
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
	},
	extraReducers: (builder) => {
		builder
			.addCase(getSitesList.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getSitesList.fulfilled, (state, action) => {
				state.isLoading = false;
				state.backupProviders = action.payload.availableProviders;
				state.backupSites = action.payload.allSites;
			})
			.addCase(getSitesList.rejected, (state, action) => {
				state.isLoading = false;
				state.isErrored = true;
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
				state.backupSnapshots = action.payload.snapshots.snapshots;
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
				state.isLoading = true;
			})
			.addCase(requestSubsequentSnapshots.fulfilled, (state, action) => {
				snapshotsEntityAdapter.upsertMany(state.backupSnapshots, action.payload.snapshots.snapshots);
				state.isLoading = false;
				state.currentSnapshotsPage = action.payload.snapshots.pagination.currentPage;
				state.totalSnapshotsPages = action.payload.snapshots.pagination.lastPage;
			})
			.addCase(requestSubsequentSnapshots.rejected, (state) => {
				state.isLoading = false;
			});
	},
});

const snapshotsEntityAdapterSnapshots = snapshotsEntityAdapter.getSelectors<AppState>(
	(state) => state.multiMachineRestore.backupSnapshots,
);

export const selectMultiMachineActiveSiteSnapshots = createSelector(
	[
		snapshotsEntityAdapterSnapshots.selectAll,
	],
	(selectAll) => selectAll,
);
