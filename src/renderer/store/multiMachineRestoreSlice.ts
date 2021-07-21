import {
	createSlice,
} from '@reduxjs/toolkit';
import type { BackupSite, BackupSnapshot, HubOAuthProviders } from '../../types';

/**
 * State for the active site.
 */
export const multiMachineRestoreSlice = createSlice({
	name: 'multiMachineRestore',
	initialState: {
		backupSites: [] as BackupSite[],
		backupSnapshots: [] as BackupSnapshot[],
		selectedSite: null as string,
		selectedSnapshot: null as BackupSnapshot,
		selectedProvider: null as HubOAuthProviders,
	},
	reducers: {
		setAllBackupSites: (state, action) => {
			state.backupSites = action.payload;
			return state;
		},
		setBackupSnapshots: (state, action) => {
			state.backupSnapshots = action.payload;
			return state;
		},
		setSelectedSite: (state, action) => {
			state.selectedSite = action.payload;
			return state;
		},
		setSelectedSnapshot: (state, action) => {
			state.selectedSnapshot = action.payload;
			return state;
		},
		setSelectedProvider: (state, action) => {
			state.selectedProvider = action.payload;
			return state;
		},
	},
});
