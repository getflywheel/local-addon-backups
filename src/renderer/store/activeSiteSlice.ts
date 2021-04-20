import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import { BackupSnapshot } from '../../types';
import {
	backupSite,
	getSnapshotsForActiveSiteProviderHub,
	updateActiveSite,
} from './thunks';

/**
 * State for the active site.
 */
export const activeSiteSlice = createSlice({
	name: 'activeSite',
	initialState: {
		id: null as string | null,
		/** if currently backing up this is the meta/placeholder data else null since nothing is in progress **/
		backingUpMeta: null as {
			isInProgress: boolean,
			snapshot: BackupSnapshot,
		} | null,
		isLoadingSnapshots: false,
		snapshots: null as BackupSnapshot[] | null,
	},
	reducers: {
		dismissError: (state) => {
			state.backingUpMeta = null;
		},
		setActiveSiteID: (state, action: PayloadAction<string>) => {
			state.id = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(backupSite.fulfilled, (state) => {
			state.backingUpMeta = null;
		});
		builder.addCase(backupSite.pending, (state, { meta }) => {
			state.backingUpMeta = {
				snapshot: {
					configObject: {
						description: meta.arg,
					},
					hash: 'placeholder-hash',
					id: -1,
					repoID: -1,
					status: 'started',
				},
				isInProgress: true,
			};
		});
		builder.addCase(backupSite.rejected, (state) => {
			state.backingUpMeta = {
				...{
					snapshot: {
						...state.backingUpMeta.snapshot,
						status: 'errored',
					},
				},
				...{
					isInProgress: false,
				},
			};
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.fulfilled, (state, { payload }) => {
			state.isLoadingSnapshots = false;
			state.snapshots = payload ?? [];
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.pending, (state) => {
			state.isLoadingSnapshots = true;

			if (state.backingUpMeta) {
				// clear out since we're not backing up right now
				state.backingUpMeta = null;
			}
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.rejected, (state, action) => {
			state.isLoadingSnapshots = false;
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
		builder.addCase(updateActiveSite.fulfilled, (state, { payload }) => {
			state.id = payload;
		});
		builder.addCase(updateActiveSite.rejected, (_, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
	},
});
