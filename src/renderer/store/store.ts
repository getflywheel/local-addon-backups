import { useSelector, TypedUseSelectorHook } from 'react-redux';
import {
	configureStore,
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import {
	providersSlice,
} from './providersSlice';
import * as thunks from './thunks';

export { selectors } from './selectors';

/**
 * The site that's currently "active".
 */
const activeSiteIDSlice = createSlice({
	name: 'activeSiteID',
	initialState: null as string | null,
	reducers: {
		setActiveSiteID: (state, action: PayloadAction<string>) => {
			state = action.payload;
			return state;
		},
	},
});

/**
 * Convenience collection of Redux actions.
 */
 export const actions = {
	...activeSiteIDSlice.actions,
	...providersSlice.actions,
	// include all thunks here to make it easier to reference both actions and thunks from same place
	...thunks,
};

/**
 * The Redux store.
 */
export const store = configureStore({
	reducer: {
		activeSiteID: activeSiteIDSlice.reducer,
		providers: providersSlice.reducer,
	},
});

/**
 * Init store calls.
 */
store.dispatch(thunks.init());

/**
 * Redux store typings.
 */
 export type State = ReturnType<typeof store.getState>;
 export const useStoreSelector = useSelector as TypedUseSelectorHook<State>;
