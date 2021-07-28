import {
	createSlice, SerializedError,
} from '@reduxjs/toolkit';
import type { BackupSite, BackupSnapshot, HubOAuthProviders, HubProviderRecord } from '../../types';
import { getSitesList, getSnapshotList, setMultiMachineProviderAndUpdateSnapshots } from './multiMachineThunks';

/**
 * State for the active site.
 */
export const multiMachineRestoreSlice = createSlice({
	name: 'multiMachineRestore',
	initialState: {
		backupSites: [] as BackupSite[],
		backupSnapshots: [] as BackupSnapshot[],
		backupProviders: [] as HubProviderRecord[],
		individualSiteRepoProviders: [] as HubProviderRecord[],
		selectedSite: null as BackupSite,
		selectedSnapshot: null as BackupSnapshot,
		selectedProvider: null as HubProviderRecord,
		isLoading: false,
		isErrored: false,
		activeError: null as SerializedError,
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
			.addCase(getSnapshotList.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(getSnapshotList.fulfilled, (state, action) => {
				state.isLoading = false;
				state.backupSnapshots = action.payload.snapshots.snapshots;
				state.individualSiteRepoProviders = action.payload.individualSiteProviders;
				state.selectedProvider = action.payload.individualSiteProviders[0];
			})
			.addCase(getSnapshotList.rejected, (state, action) => {
				state.isLoading = false;
				state.isErrored = true;
				state.activeError = action.payload;
			})
			.addCase(setMultiMachineProviderAndUpdateSnapshots.pending, (state) => {
				state.isLoading = true;
			})
			.addCase(setMultiMachineProviderAndUpdateSnapshots.fulfilled, (state, action) => {
				state.isLoading = false;
				state.backupSnapshots = action.payload.snapshots.snapshots;
				state.selectedProvider = action.payload.provider;
			})
			.addCase(setMultiMachineProviderAndUpdateSnapshots.rejected, (state, action) => {
				state.isLoading = false;
				state.isErrored = true;
				state.activeError = action.payload;
			});
	},
});
