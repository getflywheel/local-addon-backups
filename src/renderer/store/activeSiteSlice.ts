import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
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
		hasErrorLoadingSnapshots: false,
		isLoadingSnapshots: false,
	},
	reducers: {
		setActiveSiteID: (state, action: PayloadAction<string>) => {
			state.id = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(getSnapshotsForActiveSiteProviderHub.fulfilled, (state ) => {
			state.isLoadingSnapshots = false;
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.pending, (state) => {
			state.isLoadingSnapshots = true;
			state.hasErrorLoadingSnapshots = false;
		});
		builder.addCase(getSnapshotsForActiveSiteProviderHub.rejected, (state) => {
			state.isLoadingSnapshots = false;
			state.hasErrorLoadingSnapshots = true;
		});
		builder.addCase(updateActiveSite.fulfilled, (state, { payload }) => {
			state.id = payload;
		});
	},
});
