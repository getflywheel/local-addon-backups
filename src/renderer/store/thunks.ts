import { createAsyncThunk } from '@reduxjs/toolkit';
import type { HubProviderRecord } from '../../types';
import { State } from './store';
import { ipcAsync } from '@getflywheel/local/renderer';

const localStorageKey = 'local-addon-backups-activeProviders';

/**
 * Init call to get any persisted provider data from local storage.
 */
const initActiveProvidersLocalStorage = createAsyncThunk(
	'initActiveProvidersLocalStorage',
	async (_, { rejectWithValue, getState }) => {
		const state = getState() as State;

		try {
			// merge in-memory active providers with those from local-storage
			return {
				...state.providers.activeProviders,
				...JSON.parse(window.localStorage.getItem(localStorageKey)),
			};
		}
		catch (error) {
			if (!error.response) {
				throw error;
			}

			return rejectWithValue(error.response);
		}
	}
);

/**
 * Init provider data from Hub.
 */
const initProvidersHub = createAsyncThunk(
   'initProvidersHub',
   async (_, { rejectWithValue, getState }) => {
	   const state = getState() as State;

	   try {
		   const providers: HubProviderRecord[] = await ipcAsync('backups:enabled-providers');

		   return providers;
	   }
	   catch (error) {
		   if (!error.response) {
			   throw error;
		   }

		   return rejectWithValue(error.response);
	   }
   }
);

/**
 * Entry point for any and all async init calls.
 */
 const init = createAsyncThunk(
	'init',
	async (_, { dispatch }) => {
		dispatch(initActiveProvidersLocalStorage());
		dispatch(initProvidersHub());
	}
 );

/**
 * Persist changes to the active provider for the active site.
 */
const setActiveProviderAndPersist = createAsyncThunk(
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

export {
	init,
	initActiveProvidersLocalStorage,
	initProvidersHub,
	setActiveProviderAndPersist,
}
