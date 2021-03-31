import {
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import type { HubProviderRecord } from '../../types';
import {
	initActiveProvidersLocalStorage,
	initProvidersHub,
	setActiveProviderAndPersist,
} from './thunks';

type ActiveProvidersLookup = {[key: string]: HubProviderRecord['id']};

export const providersSlice = createSlice({
	name: 'providers',
	initialState: {
		/**
		 * Lookup table of active provider ids for each given site.
		 */
		activeProviders: {} as ActiveProvidersLookup,
		/**
		 * List of providers from Hub that can be used for all sites.
		 */
		enabledProviders: [] as HubProviderRecord[],
		/**
		 * Whether list of enabled providers from Hub is loading.
		 */
		isLoadingEnabledProviders: false,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(initActiveProvidersLocalStorage.fulfilled, (state, { payload }) => {
			state.activeProviders = payload;
		});
		builder.addCase(initActiveProvidersLocalStorage.rejected, (_, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
		builder.addCase(initProvidersHub.fulfilled, (state, { payload }) => {
			state.isLoadingEnabledProviders = false;
			state.enabledProviders = payload;
		});
		builder.addCase(initProvidersHub.pending, (state, { payload }) => {
			state.isLoadingEnabledProviders = true;
		});
		builder.addCase(initProvidersHub.rejected, (state, action) => {
			state.isLoadingEnabledProviders = false;
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
		builder.addCase(setActiveProviderAndPersist.fulfilled, (state, { payload }) => {
			state.activeProviders = payload;
		});
		builder.addCase(setActiveProviderAndPersist.rejected, (_, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
	}
});
