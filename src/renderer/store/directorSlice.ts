import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import type { BackupSnapshot } from '../../types';
import { backupSite } from './thunks';

/**
 * Controls state variables that pertain to all sites
 * Eg, is a backup currently in progress, etc...
 */
export const directorSlice = createSlice({
	name: 'director',
	initialState: {
		backupRunning: false as boolean,
		/** whether backups is currently running (limited to 1) **/
		backupIsRunning: false as boolean,
		/** the site id for the currently running backup **/
		backupSiteId: null as string | null,
		/** a placeholder for the snapshot so it can be shown in the UI as either in-progress or having failed **/
		backupSnapshotPlaceholder: null as BackupSnapshot | null,
	},
	reducers: {
		dismissBackupAttempt: (state) => {
			// clear backup details thus signaling that there is no active or pending backup
			state.backupIsRunning = false;
			state.backupSiteId = null;
			state.backupSnapshotPlaceholder = null;
		},
		// todo - crum remove this once support for create, clone, and restore use `currentBackup` instead
		setBackupRunningState: (state, action: PayloadAction<boolean>) => {
			state.backupRunning = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(backupSite.fulfilled, (state) => {
			// clear backup details thus signaling that there is no active or pending backup
			state.backupIsRunning = false;
			state.backupSiteId = null;
			state.backupSnapshotPlaceholder = null;
		});
		builder.addCase(backupSite.pending, (state, { meta }) => {
			// signal in-progress "running" state
			state.backupIsRunning = true;
			state.backupSiteId = meta.arg.siteId;
			state.backupSnapshotPlaceholder = {
				configObject: {
					description: meta.arg.description,
				},
				hash: 'placeholder-hash',
				id: -1,
				repoID: -1,
				status: 'started',
			};
		});
		builder.addCase(backupSite.rejected, (state) => {
			// signal stalled by keeping other state but toggling running state
			state.backupIsRunning = false;
			state.backupSnapshotPlaceholder = {
				...state.backupSnapshotPlaceholder,
				status: 'errored',
			};
		});
	},
});
