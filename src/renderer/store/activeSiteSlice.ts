import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import { BackupSnapshot } from '../../types';
import {
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
		isLoadingSnapshots: false,
		snapshots: null as BackupSnapshot[] | null,
	},
	reducers: {
		setActiveSiteID: (state, action: PayloadAction<string>) => {
			state.id = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(getSnapshotsForActiveSiteProviderHub.fulfilled, (state, { payload }) => {
			state.isLoadingSnapshots = false;
			state.snapshots = payload ?? [];
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.pending, (state ) => {
			state.isLoadingSnapshots = true;
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
