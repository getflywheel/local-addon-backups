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
		snapshots: null as BackupSnapshot[] | null,
	},
	reducers: {
		setActiveSiteID: (state, action: PayloadAction<string>) => {
			state.id = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(getSnapshotsForActiveSiteProviderHub.fulfilled, (state, { payload }) => {
			state.snapshots = payload;
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.pending, (state, { payload }) => {
			// todo - crum: handle pending
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.rejected, (_, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
		builder.addCase(updateActiveSite.fulfilled, (state, { payload }) => {
			state.id = payload;

			console.log('updateActiveSite.fulfilled: ', payload);
		});
		builder.addCase(updateActiveSite.rejected, (_, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
	},
});
