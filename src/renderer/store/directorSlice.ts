import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';

/**
 * Controls state variables that pertain to all sites
 * Eg, is a backup currently in progress, etc...
 */
export const directorSlice = createSlice({
	name: 'director',
	initialState: {
		backupRunning: false as boolean,
	},
	reducers: {
		setBackupRunningState: (state, action: PayloadAction<boolean>) => {
			state.backupRunning = action.payload;
		},
	},
});
