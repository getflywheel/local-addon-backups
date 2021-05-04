import { createAsyncThunk } from '@reduxjs/toolkit';
import type { BackupSnapshot, HubProviderRecord } from '../../types';
import { AppThunkApiConfig, AppState } from './store';
import { ipcAsync } from '@getflywheel/local/renderer';
import { selectors } from './selectors';
import { hubProviderToProvider } from '../helpers/hubProviderToProvider';
import { IPCASYNC_EVENTS } from '../../constants';
import dispatchAsyncThunk from './helpers/dispatchAsyncUnwrapped.js';
import { showSiteBanner } from '../helpers/showSiteBanner';
import { clearSiteBanner } from '../helpers/clearSiteBanner';
import { IpcAsyncResponse } from '../../helpers/createIpcAsyncResponse';
import { handleIPCResponseOrRejectWithError } from '../helpers/thunkUtils';

const localStorageKey = 'local-addon-backups-activeProviders';

/**
 * Get selected provider's snapshots from hub for active site.
 */
const getSnapshotsForActiveSiteProviderHub = createAsyncThunk(
	'getSnapshotsForActiveSiteProviderHub',
	async (_, { rejectWithValue, getState }) => {
		const {
			activeSite,
			providers,
		} = getState() as AppState;

		// clear out any previous banner caused by this thunk
		clearSiteBanner(activeSite.id, getSnapshotsForActiveSiteProviderHub.typePrefix);

		try {
			if (!activeSite?.id) {
				return null;
			}

			return await ipcAsync(
				IPCASYNC_EVENTS.GET_SITE_PROVIDER_BACKUPS,
				activeSite.id,
				providers.activeProviders[activeSite.id],
			) as BackupSnapshot[];
		} catch (error) {
			showSiteBanner({
				icon: 'warning',
				id: getSnapshotsForActiveSiteProviderHub.typePrefix,
				message: `There was an issue retrieving your site's list of backups.`,
				siteID: activeSite.id,
				title: 'Cloud Backups Error',
				variant: 'error',
			});

			if (!error.response) {
				throw error;
			}

			return rejectWithValue(error.response);
		}
	},
);

/**
 * Request to backup site to Hub.
 */
const backupSite = createAsyncThunk<
	null, // types return here and for extraReducers fulfilled
	{ description: string, siteId: string, siteName: string }, // types function signature and extraReducers meta 'arg'
	AppThunkApiConfig<null> // types rejected return here and for extraReducers rejected
>(
	'backupSite',
	async (
		{
			description,
			siteId,
			siteName,
		}, {
			dispatch,
			getState,
			rejectWithValue,
		},
	) => {
		const thunkName = backupSite.typePrefix;
		const state = getState();
		const rsyncProviderId = hubProviderToProvider(selectors.selectActiveProvider(state)?.id);

		// clear out any previous banner caused by this thunk
		clearSiteBanner(siteId, thunkName);

		const response: IpcAsyncResponse<null> = await ipcAsync(
			IPCASYNC_EVENTS.START_BACKUP,
			state.activeSite.id,
			rsyncProviderId,
			description,
		);

		if (response.error) {
			showSiteBanner({
				siteID: siteId,
				id: thunkName,
				variant: 'error',
				icon: 'warning',
				title: 'Cloud Backup failed!',
				message: `There was an error while completing your backup.`,
			});

			return rejectWithValue(null);
		}

		showSiteBanner({
			siteID: siteId,
			variant: 'success',
			id: thunkName,
			title: 'Cloud Backup complete!',
			message: `${siteName} has been successfully backed up.`,
		});

		// asynchronous refresh snapshots (don't await)
		dispatch(getSnapshotsForActiveSiteProviderHub());

		return null;
	},
);

/**
 * Request to restore backup from to site from Hub.
 */
const restoreSite = createAsyncThunk(
	'restoreSite',
	async (snapshotID: string, { rejectWithValue, getState }) => {
		const state = getState() as AppState;
		const rsyncProviderId = hubProviderToProvider(selectors.selectActiveProvider(state)?.id);
		try {
			/**
			 * Light convenience wrapper around ipcAsync to backup a site
			 *
			 * @param site
			 * @param provider
			 */
			return await ipcAsync(
				IPCASYNC_EVENTS.RESTORE_BACKUP,
				state.activeSite.id,
				rsyncProviderId,
				snapshotID,
			) as null;
		} catch (error) {
			if (!error.response) {
				throw error;
			}

			return rejectWithValue(error.response);
		}
	},
);

/**
 * Get provider data from Hub.
 */
const getEnabledProvidersHub = createAsyncThunk<
	IpcAsyncResponse<HubProviderRecord[]>, // types return here and for extraReducers fulfilled
	{ siteId: string }, // types function signature and extraReducers meta 'arg'
	AppThunkApiConfig // types rejected return here and for extraReducers rejected
>(
	'getEnabledProvidersHub',
	async (
		{ siteId },
		{ rejectWithValue },
	) => {
		return await handleIPCResponseOrRejectWithError<HubProviderRecord[]>(
			IPCASYNC_EVENTS.GET_ENABLED_PROVIDERS,
			siteId,
			rejectWithValue,
			(responseData, _) => {
				if (responseData.isErrorAndUncaptured) {
					showSiteBanner({
						icon: 'warning',
						id: responseData.bannerId,
						message: 'There was an issue retrieving your backup providers.',
						siteID: siteId,
						title: 'Cloud Backups Error',
						variant: 'error',
					});
				}
			},
			backupSite.typePrefix,
		);
	},
);

/**
 * Init call to get any persisted provider data from local storage.
 */
const initActiveProvidersFromLocalStorage = createAsyncThunk(
	'initActiveProvidersFromLocalStorage',
	async (_, { rejectWithValue, getState }) => {
		const state = getState() as AppState;

		try {
			// merge in-memory active providers with those from local-storage
			return {
				...state.providers.activeProviders,
				...JSON.parse(window.localStorage.getItem(localStorageKey)),
			};
		} catch (error) {
			if (!error.response) {
				throw error;
			}

			return rejectWithValue(error.response);
		}
	},
);

/**
 * Persist changes to the active provider for the active site.
 */
const setActiveProviderAndPersist = createAsyncThunk(
	'setActiveProviderAndPersist',
	async (providerId: HubProviderRecord['id'], { getState, rejectWithValue }) => {
		const state = getState() as AppState;
		const activeProviders = {
			...state.providers.activeProviders,
			[state.activeSite.id]: providerId,
		};

		try {
			localStorage.setItem(localStorageKey, JSON.stringify(activeProviders));

			return activeProviders;
		} catch (err) {
			if (!err.response) {
				throw err;
			}

			return rejectWithValue(err.response);
		}
	},
);

/**
 * Saga of dispatches to update active provider and retrieve its snapshots for the active site.
 */
const setActiveProviderPersistAndUpdateSnapshots = createAsyncThunk(
	'setActiveProviderPersistAndUpdateSnapshots',
	async (providerId: HubProviderRecord['id'], { dispatch, rejectWithValue }) => {
		try {
			await dispatchAsyncThunk(setActiveProviderAndPersist(providerId));
			// asynchronous get snapshots given the site and provider
			dispatch(getSnapshotsForActiveSiteProviderHub());

			return null;
		} catch (err) {
			if (!err.response) {
				throw err;
			}

			return rejectWithValue(err.response);
		}
	},
);

/**
 * Persist changes to the active provider for the active site.
 */
const updateActiveSite = createAsyncThunk(
	'updateActiveSite',
	async (siteId: string | null, { dispatch, getState, rejectWithValue }) => {
		try {
			const { providers: { activeProviders } } = getState() as AppState;

			// do only once per runtime, if unpopulated, as redux and local-storage stays in sync after that
			// note: this call should have no other data dependencies (e.g. siteId, enabledProviders, etc)
			!activeProviders && dispatch(initActiveProvidersFromLocalStorage());

			return siteId;
		} catch (err) {
			if (!err.response) {
				throw err;
			}

			return rejectWithValue(err.response);
		}
	},
);

/**
 * Chains together several thunks resulting from updating the active site that updates the providers and snapshots.
 */
const updateActiveSiteAndDataSources = createAsyncThunk(
	'updateActiveSiteAndDataSources',
	async (siteId: string | null, { dispatch, rejectWithValue }) => {
		try {
			// update active site details
			await dispatchAsyncThunk(updateActiveSite(siteId));
			// (re)check for enabled providers on hub
			// note: this call should have no other data dependencies (e.g. siteId, enabledProviders, etc)
			await dispatchAsyncThunk(getEnabledProvidersHub({ siteId }));
			// get snapshots given the site and provider
			dispatch(getSnapshotsForActiveSiteProviderHub());

			return siteId;
		} catch (error) {
			// Note: error banners are handled in the individual thunks therefore not here

			if (!error.response) {
				throw error;
			}

			return rejectWithValue(error.response);
		}
	},
);

export {
	backupSite,
	restoreSite,
	initActiveProvidersFromLocalStorage,
	getEnabledProvidersHub,
	getSnapshotsForActiveSiteProviderHub,
	setActiveProviderAndPersist,
	setActiveProviderPersistAndUpdateSnapshots,
	updateActiveSite,
	updateActiveSiteAndDataSources,
};
