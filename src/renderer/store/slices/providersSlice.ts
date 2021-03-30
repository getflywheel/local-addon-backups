import {
	createAsyncThunk,
	createSlice,
	PayloadAction,
} from '@reduxjs/toolkit';
import type { HubProviderRecord } from '../../../types';
import { State } from '../store';

type ActiveProvidersLookup = {[key: string]: HubProviderRecord['id']};

const localStorageKey = 'local-addon-backups-activeProviders'

export const setActiveProviderAndPersist = createAsyncThunk(
	'setActiveProviderAndPersist',
	async (providerId: HubProviderRecord['id'], { rejectWithValue, getState }) => {
		const state = getState() as State;
		const activeProviders = {
			...state.providers.activeProviders,
			[state.activeSiteID]: providerId,
		};

		try {
			localStorage.setItem(localStorageKey, JSON.stringify(activeProviders));
			return activeProviders;
		}
		catch (err) {
			if (!err.response) {
				throw err;
			}

			return rejectWithValue(err.response);
		}
	}
);

export const initProvidersFromLocalStorage = createAsyncThunk(
	'initProvidersFromLocalStorage',
	async (_, { rejectWithValue, getState }) => {
		const state = getState() as State;

		try {
			return {
				...state.providers.activeProviders,
				...JSON.parse(window.localStorage.getItem(localStorageKey)),
			};
		}
		catch (err) {
			if (!err.response) {
				throw err;
			}

			return rejectWithValue(err.response);
		}
	}
);

export const providersSlice = createSlice({
	name: 'providers',
	initialState: {
		/**
		 * Lookup table of active provider ids for each given site.
		 */
		activeProviders: {} as ActiveProvidersLookup,
	},
	reducers: {},
	extraReducers: (builder) => {
		builder.addCase(initProvidersFromLocalStorage.fulfilled, (state, { payload, meta }) => {
			state.activeProviders = payload;
		});
		builder.addCase(initProvidersFromLocalStorage.rejected, (state, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
		builder.addCase(setActiveProviderAndPersist.fulfilled, (state, { payload, meta }) => {
			state.activeProviders = payload;
		});
		builder.addCase(setActiveProviderAndPersist.rejected, (state, action) => {
			// todo - crum: handle error
			console.log('...rejected:', action.error);
		});
	}
});
