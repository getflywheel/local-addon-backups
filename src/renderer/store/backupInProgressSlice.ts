import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';

/**
 * State for whether a backup or restore is currently in progress.
 */
export const backupInProgressSlice = createSlice({
	name: 'backupInProgress',
	initialState: {
		backupRunning: false as boolean,
	},
	reducers: {
		setBackupRunningState: (state, action: PayloadAction<boolean>) => {
			state.backupRunning = action.payload;
		},
	},
});
