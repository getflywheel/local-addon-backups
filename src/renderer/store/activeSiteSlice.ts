import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import { BackupSnapshot } from '../../types';
import {
	getSnapshotForActiveSiteProviderHub,
	updateActiveSiteAndDataSources,
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
		builder.addCase(getSnapshotForActiveSiteProviderHub.fulfilled, (state, { payload }) => {
			state.snapshots = payload;
		});
		builder.addCase(getSnapshotForActiveSiteProviderHub.pending, (state, { payload }) => {
			// todo - crum: handle pending
		});
		builder.addCase(getSnapshotForActiveSiteProviderHub.rejected, (_, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
		builder.addCase(updateActiveSiteAndDataSources.fulfilled, (state, { payload }) => {
			state.id = payload;
		});
		builder.addCase(updateActiveSiteAndDataSources.rejected, (_, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
	},
});
