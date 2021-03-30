import { useSelector, TypedUseSelectorHook } from 'react-redux';
import {
	configureStore,
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import {
	initProvidersFromLocalStorage,
	providersSlice,
	setActiveProviderAndPersist,
} from './slices/providersSlice';
import type { HubProviderRecord } from '../../types';

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
 * List of backup providers (e.g. google drive, dropbox) enabled for a particular site.
 */
const enabledProvidersSlice = createSlice({
	name: 'enabledProviders',
	initialState: [] as HubProviderRecord[],
	reducers: {
		setEnabledProviders: (state, action: PayloadAction<HubProviderRecord[]>) => {
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
	...enabledProvidersSlice.actions,
	...providersSlice.actions,
	setActiveProviderAndPersist,
};

/**
 * The Redux store.
 */
export const store = configureStore({
	reducer: {
		activeSiteID: activeSiteIDSlice.reducer,
		enabledProviders: enabledProvidersSlice.reducer,
		providers: providersSlice.reducer,
	},
});

/**
 * Init store calls.
 */
store.dispatch(initProvidersFromLocalStorage());

/**
 * Redux store typings.
 */
 export type State = ReturnType<typeof store.getState>;
 export const useStoreSelector = useSelector as TypedUseSelectorHook<State>;
