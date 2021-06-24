import { createSlice } from '@reduxjs/toolkit';
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
		/** Lookup table of active provider ids for each given site */
		activeProviders: null as ActiveProvidersLookup | null,
		/** List of providers from Hub that can be used for all sites */
		enabledProviders: [] as HubProviderRecord[] | null,
		/** Whether loading the providers resulted in an error */
		hasErrorLoadingEnabledProviders: false,
		/** Whether list of enabled providers from Hub is loading */
		isLoadingEnabledProviders: false,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(initActiveProvidersFromLocalStorage.fulfilled, (state, { payload }) => {
			state.activeProviders = payload;
		});
		builder.addCase(getEnabledProvidersHub.fulfilled, (state, { payload, meta }) => {
			state.isLoadingEnabledProviders = false;
			state.enabledProviders = payload.result;

			// if the active provider is no longer enabled for this site
			if (state.activeProviders
				&& state.activeProviders[meta.arg.siteId]
				&& !state.enabledProviders.some((provider => provider.id === state.activeProviders[meta.arg.siteId]))
			) {
				delete state.activeProviders[meta.arg.siteId];
			}
		});
		builder.addCase(getEnabledProvidersHub.pending, (state) => {
			state.hasErrorLoadingEnabledProviders = false;
			state.isLoadingEnabledProviders = true;
		});
		builder.addCase(getEnabledProvidersHub.rejected, (state) => {
			state.hasErrorLoadingEnabledProviders = true;
			state.isLoadingEnabledProviders = false;
		});
		builder.addCase(setActiveProviderAndPersist.fulfilled, (state, { payload }) => {
			state.activeProviders = payload;
		});
	},
});
