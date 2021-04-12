import { createAsyncThunk } from '@reduxjs/toolkit';
import type { BackupSnapshot, HubProviderRecord } from '../../types';
import { State } from './store';
import { ipcAsync } from '@getflywheel/local/renderer';
import { selectors } from './selectors';
import { hubProviderToProvider } from '../helpers/hubProviderToProvider';

const localStorageKey = 'local-addon-backups-activeProviders';

/**
 * Request to backup site to Hub.
 */
 const backupSite = createAsyncThunk(
	'backupSite',
	async (description:string, { rejectWithValue, getState }) => {
		const state = getState() as State;
		const rsyncProviderId = hubProviderToProvider(selectors.selectActiveProvider(state)?.id);

		try {
			/**
			 * Light convenience wrapper around ipcAsync to backup a site
			 *
			 * @param site
			 * @param provider
			 */
			return await ipcAsync(
				'backups:backup-site',
				state.activeSite.id,
				rsyncProviderId,
				description,
			) as null;
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
 * Get provider data from Hub.
 */
 const getEnabledProvidersHub = createAsyncThunk(
	'getEnabledProvidersHub',
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
 * Get selected provider's snapshots from hub for active site.
 */
const getSnapshotsForActiveSiteProviderHub = createAsyncThunk(
	'getSnapshotsForActiveSiteProviderHub',
	async (_, { rejectWithValue, getState }) => {
		const {
			activeSite,
			providers,
		} = getState() as State;

		try {
			if (!activeSite?.id) {
				return null;
			}

			return await ipcAsync(
				'backups:provider-snapshots',
				activeSite.id,
				providers.activeProviders[activeSite.id],
			) as BackupSnapshot[];
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
 * Init call to get any persisted provider data from local storage.
 */
const initActiveProvidersFromLocalStorage = createAsyncThunk(
	'initActiveProvidersFromLocalStorage',
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
 * Persist changes to the active provider for the active site.
 */
const setActiveProviderAndPersist = createAsyncThunk(
	'setActiveProviderAndPersist',
	async (providerId: HubProviderRecord['id'], { rejectWithValue, getState }) => {
		const state = getState() as State;
		const activeProviders = {
			...state.providers.activeProviders,
			[state.activeSite.id]: providerId,
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

/**
 * Persist changes to the active provider for the active site.
 */
 const updateActiveSite = createAsyncThunk(
	'updateActiveSite',
	async (siteId: string | null, { dispatch, getState, rejectWithValue }) => {
		try {
			const { providers: { activeProviders } } = getState() as State;

			// do only once per runtime, if unpopulated, as redux and local-storage stays in sync after that
			// note: this call should have no other data depedencies (e.g. siteId, enabledProviders, etc)
			!activeProviders && dispatch(initActiveProvidersFromLocalStorage());

			return siteId;
		}
		catch (err) {
			if (!err.response) {
				throw err;
			}

			return rejectWithValue(err.response);
		}
	}
);

/**
 * Chains together several thunks resulting from updating the active site.
 */
 const updateActiveSiteAndDataSources = createAsyncThunk(
	'updateActiveSiteAndDataSources',
	async (siteId: string | null, { dispatch, rejectWithValue }) => {
		try {
			// update active site details
			await dispatch(updateActiveSite(siteId));
			// (re)check for enabled providers on hub
			// note: this call should have no other data depedencies (e.g. siteId, enabledProviders, etc)
			await dispatch(getEnabledProvidersHub());
			// get snapsshots given the site and provider
			dispatch(getSnapshotsForActiveSiteProviderHub());

			return siteId;
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
	backupSite,
	initActiveProvidersFromLocalStorage,
	getEnabledProvidersHub,
	getSnapshotsForActiveSiteProviderHub,
	setActiveProviderAndPersist,
	updateActiveSite,
	updateActiveSiteAndDataSources,
};