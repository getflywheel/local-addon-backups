import {
	createSlice,
} from '@reduxjs/toolkit';
import type { HubProviderRecord } from '../../types';
import {
	initActiveProvidersFromLocalStorage,
	getEnabledProvidersHub,
	setActiveProviderAndPersist,
} from './thunks';

type ActiveProvidersLookup = {[key: string]: HubProviderRecord['id']};

export const providersSlice = createSlice({
	name: 'providers',
	initialState: {
		/**
		 * Lookup table of active provider ids for each given site.
		 */
		activeProviders: null as ActiveProvidersLookup | null,
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
		builder.addCase(initActiveProvidersFromLocalStorage.fulfilled, (state, { payload }) => {
			state.activeProviders = payload;
		});
		builder.addCase(initActiveProvidersFromLocalStorage.rejected, (_, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
		builder.addCase(getEnabledProvidersHub.fulfilled, (state, { payload }) => {
			state.isLoadingEnabledProviders = false;
			state.enabledProviders = payload;
		});
		builder.addCase(getEnabledProvidersHub.pending, (state, { payload }) => {
			state.isLoadingEnabledProviders = true;
		});
		builder.addCase(getEnabledProvidersHub.rejected, (state, action) => {
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
