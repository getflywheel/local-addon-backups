import {
	createSlice,
} from '@reduxjs/toolkit';
import type { BackupSite } from '../../types';

/**
 * State for the active site.
 */
export const multiMachineRestoreSlice = createSlice({
	name: 'multiMachineRestore',
	initialState: {
		backupSites: [] as BackupSite[],
	},
	reducers: {
		setAllBackupSites: (state, action) => {
			state.backupSites = action.payload;
			return state;
		},
	},
});
