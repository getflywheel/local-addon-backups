import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import { updateActiveSiteAndDataSources } from './thunks';

/**
 * The site that's currently "active".
 */
 export const activeSiteSlice = createSlice({
	name: 'activeSiteID',
	initialState: null as string | null,
	reducers: {
		setActiveSiteID: (state, action: PayloadAction<string>) => {
			state = action.payload;
			return state;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(updateActiveSiteAndDataSources.fulfilled, (_, { payload }) => {
			return payload;
		});
		builder.addCase(updateActiveSiteAndDataSources.rejected, (_, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
	},
});
