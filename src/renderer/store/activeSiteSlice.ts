import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import { updateActiveSite } from './thunks';

/**
 * State for the active site.
 */
export const activeSiteSlice = createSlice({
	name: 'activeSite',
	initialState: {
		id: null as string | null,
	},
	reducers: {
		setActiveSiteID: (state, action: PayloadAction<string>) => {
			state.id = action.payload;
		},
	},
	extraReducers: (builder) => {
		builder.addCase(updateActiveSite.fulfilled, (state, { payload }) => {
			state.id = payload;
		});
	},
});
