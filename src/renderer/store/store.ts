import { useSelector, TypedUseSelectorHook } from 'react-redux';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { HubProviderRecord } from '../../types';

export { selectors } from './selectors';

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

export const store = configureStore({
	reducer: {
		activeSiteID: activeSiteIDSlice.reducer,
		enabledProviders: enabledProvidersSlice.reducer,
	},
});

export const actions = {
	...activeSiteIDSlice.actions,
	...enabledProvidersSlice.actions,
};

export type State = ReturnType<typeof store.getState>;
export const useStoreSelector = useSelector as TypedUseSelectorHook<State>;
