import { createAsyncThunk } from '@reduxjs/toolkit';
import type { BackupSnapshot, BackupSnapshotsResult, HubProviderRecord, Providers, SiteMetaData } from '../../types';
import type { AppThunkApiConfig, AppState } from './store';
import { selectors } from './selectors';
import type { Site } from '@getflywheel/local';
import { hubProviderToProvider } from '../helpers/hubProviderToProvider';
import { IPCASYNC_EVENTS } from '../../constants';
import dispatchAsyncThunk from './helpers/dispatchAsyncUnwrapped.js';
import { showSiteBanner } from '../helpers/showSiteBanner';
import type { IpcAsyncResponse } from '../../helpers/createIpcAsyncResponse';
import { callIPCAsyncAndProcessResponse } from '../helpers/thunkUtils';

const localStorageKey = 'local-addon-backups-activeProviders';

const editSnapshotMetaData = createAsyncThunk<
	IpcAsyncResponse<null>,
	{
		siteId: string,
		metaData: SiteMetaData,
		snapshot: BackupSnapshot,
	},
	AppThunkApiConfig<IpcAsyncResponse['error']>
>(
	'editSnapshotMetaData',
	async (
		{
			siteId,
			metaData,
			snapshot,
		}, {
			rejectWithValue,
		}) => await callIPCAsyncAndProcessResponse<null>(
			IPCASYNC_EVENTS.EDIT_BACKUP_DESCRIPTION,
			[{ metaData, snapshot, siteId }],
			siteId,
			rejectWithValue,
			(details) => {
				if (details.isResult) {
					showSiteBanner({
						siteID: details.siteId,
						variant: 'success',
						id: details.bannerId,
						message: `Backup description updated.`,
					});
				}

				if (details.isErrorAndUncaptured) {
					showSiteBanner({
						icon: 'warning',
						id: details.bannerId,
						message: `There was an issue updating your backup.`,
						siteID: details.siteId,
						title: 'Cloud Backups Error',
						variant: 'error',
					});
				}
			},
			editSnapshotMetaData.typePrefix,
		),
);

/**
 * Get selected provider's snapshots from hub for active site.
 */
const getSnapshotsForActiveSiteProviderHub = createAsyncThunk<
	IpcAsyncResponse<BackupSnapshotsResult>, // types return here and for extraReducers fulfilled
	{
		siteId: string,
		pageOffset?: number,
	}, // types function signature and extraReducers meta 'arg'
	AppThunkApiConfig<IpcAsyncResponse['error']> // types rejected return here and for extraReducers rejected
>(
	'getSnapshotsForActiveSiteProviderHub',
	async (
		{
			siteId,
			pageOffset,
		},
		{
			getState,
			rejectWithValue,
		},
	) => {
		const { providers } = getState();

		return await callIPCAsyncAndProcessResponse<BackupSnapshotsResult>(
			IPCASYNC_EVENTS.GET_SITE_PROVIDER_BACKUPS,
			[
				siteId,
				providers.activeProviders[siteId],
				// fallback to first page of results if this is '0' or not provided (undefined)
				pageOffset || 1,
			],
			siteId,
			rejectWithValue,
			(details) => {
				if (details.isErrorAndUncaptured) {
					showSiteBanner({
						icon: 'warning',
						id: details.bannerId,
						message: `There was an issue retrieving your site's list of backups.`,
						siteID: details.siteId,
						title: 'Cloud Backups Error',
						variant: 'error',
					});
				}
			},
			getSnapshotsForActiveSiteProviderHub.typePrefix,
		);
	},
);


/**
 * Request to backup site to Hub.
 */
const backupSite = createAsyncThunk<
	IpcAsyncResponse<null>, // types return here and for extraReducers fulfilled
	{
		description: string,
		providerId: HubProviderRecord['id'],
		siteId: string,
		siteName: string,
	}, // types function signature and extraReducers meta 'arg'
	AppThunkApiConfig<IpcAsyncResponse['error']> // types rejected return here and for extraReducers rejected
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
		const state = getState();
		const rsyncProviderId = hubProviderToProvider(selectors.selectActiveProvider(state)?.id);

		return await callIPCAsyncAndProcessResponse<null>(
			IPCASYNC_EVENTS.START_BACKUP,
			[
				siteId,
				rsyncProviderId,
				description,
			],
			siteId,
			rejectWithValue,
			(details) => {
				if (details.isErrorAndUncaptured) {
					showSiteBanner({
						icon: 'warning',
						id: details.bannerId,
						message: `There was an error while completing your backup.`,
						siteID: details.siteId,
						title: 'Cloud Backup failed!',
						variant: 'error',
					});
				} else if (details.isResult) {
					showSiteBanner({
						siteID: siteId,
						variant: 'success',
						id: details.bannerId,
						title: 'Cloud Backup complete!',
						message: `${siteName} has been successfully backed up.`,
					});

					if (siteId === state.activeSite.id) {
						// asynchronous refresh snapshots (don't await)
						dispatch(getSnapshotsForActiveSiteProviderHub({
							siteId,
							// get fresh results starting with page 0
							pageOffset: 1,
						}));
					}
				}
			},
			backupSite.typePrefix,
		);
	},
);

/**
 * Request to restore backup from to site from Hub.
 */
const restoreSite = createAsyncThunk<
	IpcAsyncResponse<null>, // types return here and for extraReducers fulfilled
	{ siteId: string, snapshotID: string }, // types function signature and extraReducers meta 'arg'
	AppThunkApiConfig<IpcAsyncResponse['error']> // types rejected return here and for extraReducers rejected
>(
	'restoreSite',
	async (
		{ siteId, snapshotID },
		{ getState, rejectWithValue },
	) => {
		const state = getState();
		const rsyncProviderId = hubProviderToProvider(selectors.selectActiveProvider(state)?.id);

		return await callIPCAsyncAndProcessResponse<null>(
			IPCASYNC_EVENTS.RESTORE_BACKUP,
			[
				siteId,
				rsyncProviderId,
				snapshotID,
			],
			siteId,
			rejectWithValue,
			(details, response) => {
				if (details.isErrorAndUncaptured) {
					showSiteBanner({
						icon: 'warning',
						id: details.bannerId,
						message: response?.error?.message || 'There was an error while restoring your backup.',
						siteID: details.siteId,
						title: 'Cloud Backup restore failed!',
						variant: 'error',
					});
				} else if (details.isResult) {
					showSiteBanner({
						siteID: siteId,
						variant: 'success',
						id: details.bannerId,
						title: 'Cloud Backup restore completed!',
						message: `This site has been successfully restored.`,
					});
				}
			},
			restoreSite.typePrefix,
		);
	},
);

/**
 * Request to clone backupto new site.
 */
const cloneSite = createAsyncThunk<
	IpcAsyncResponse<null>, // types return here and for extraReducers fulfilled
	{
		baseSite: Site,
		newSiteName: string,
		provider: Providers,
		snapshotHash: string,
	}, // types function signature and extraReducers meta 'arg'
	AppThunkApiConfig<IpcAsyncResponse['error']> // types rejected return here and for extraReducers rejected
>(
	'cloneSite',
	async (
		{
			baseSite,
			newSiteName,
			provider,
			snapshotHash,
		},
		{ rejectWithValue },
	) => {
		return await callIPCAsyncAndProcessResponse<null>(
			IPCASYNC_EVENTS.CLONE_BACKUP,
			[
				baseSite,
				newSiteName,
				provider,
				snapshotHash,
			],
			baseSite.id,
			rejectWithValue,
			(details) => {
				if (details.isErrorAndUncaptured) {
					showSiteBanner({
						icon: 'warning',
						id: details.bannerId,
						message: `There was an error while cloning your backup.`,
						siteID: details.siteId,
						title: 'Cloud Backup clone failed!',
						variant: 'error',
					});
				} else if (details.isResult) {
					showSiteBanner({
						siteID: details.siteId,
						variant: 'success',
						id: details.bannerId,
						title: 'Cloud Backup clone completed!',
						message: `This site has been successfully cloned.`,
					});
				}
			},
			cloneSite.typePrefix,
		);
	},
);

/**
 * Get provider data from Hub.
 */
const getEnabledProvidersHub = createAsyncThunk<
	IpcAsyncResponse<HubProviderRecord[]>, // types return here and for extraReducers fulfilled
	{ siteId: string }, // types function signature and extraReducers meta 'arg'
	AppThunkApiConfig<IpcAsyncResponse['error']> // types rejected return here and for extraReducers rejected
>(
	'getEnabledProvidersHub',
	async (
		{ siteId },
		{ rejectWithValue },
	) => await callIPCAsyncAndProcessResponse<HubProviderRecord[]>(
		IPCASYNC_EVENTS.GET_ENABLED_PROVIDERS,
		[siteId],
		siteId,
		rejectWithValue,
		(details) => {
			if (details.isErrorAndUncaptured) {
				showSiteBanner({
					icon: 'warning',
					id: details.bannerId,
					message: 'There was an issue retrieving your backup providers.',
					siteID: siteId,
					title: 'Cloud Backups Error',
					variant: 'error',
				});
			}
		},
		backupSite.typePrefix,
	),
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
const updateBackupProviderPersistAndUpdateSnapshots = createAsyncThunk<
	IpcAsyncResponse<null>, // types return here and for extraReducers fulfilled
	{ siteId: string, providerId: HubProviderRecord['id'] }, // types function signature and extraReducers meta 'arg'
	AppThunkApiConfig // types rejected return here and for extraReducers rejected
>(
	'updateBackupProviderPersistAndUpdateSnapshots',
	async (
		{
			siteId,
			providerId,
		},
		{
			dispatch,
			rejectWithValue,
		},
	) => {
		try {
			await dispatchAsyncThunk(setActiveProviderAndPersist(providerId));
			// asynchronous get snapshots given the site and provider
			dispatch(getSnapshotsForActiveSiteProviderHub({
				siteId,
			}));

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
 * Remove all snapshots for the given site.
 * Note: because this is called from another thunk, to avoid a circular reference, this is also a thunk instead of a reducer.
 */
const clearSnapshotsForSite = createAsyncThunk(
	'clearSnapshotsForSite',
	async (siteId: string | null) => {
		return siteId;
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
const updateActiveSiteAndDataSources = createAsyncThunk<
	string | null, // types return here and for extraReducers fulfilled
	{ siteId: string | null }, // types function signature and extraReducers meta 'arg'
	AppThunkApiConfig // types rejected return here and for extraReducers rejected
>(
	'updateActiveSiteAndDataSources',
	async (
		{ siteId },
		{
			dispatch,
			getState,
			rejectWithValue,
		},
	) => {
		try {
			// update active site details
			await dispatchAsyncThunk(updateActiveSite(siteId));
			// clear out existing results
			// note: do this in the event that the previous provider is removed to make sure cached results don't show
			await dispatchAsyncThunk(clearSnapshotsForSite(siteId));
			// (re)check for enabled providers on hub
			// note: this call should have no other data dependencies (e.g. siteId, enabledProviders, etc)
			await dispatchAsyncThunk(getEnabledProvidersHub({ siteId }));

			const enabledProviders = getState().providers.enabledProviders;

			if (!enabledProviders?.length) {
				return siteId;
			}

			let siteProviderId = getState().providers.activeProviders[siteId];

			// if site has no saved provider OR the currently saved provider is not in the list of enabled providers
			if (!siteProviderId || !enabledProviders.some((provider => provider.id === siteProviderId))) {
				const provider = enabledProviders[0];
				await dispatchAsyncThunk(setActiveProviderAndPersist(provider.id));
			}

			siteProviderId = getState().providers.activeProviders[siteId];

			if (!siteProviderId) {
				return siteId;
			}

			// get snapshots given the site and provider
			dispatch(getSnapshotsForActiveSiteProviderHub({
				siteId,
				// get fresh results starting with page 0
				pageOffset: 1,
			}));

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
	clearSnapshotsForSite,
	cloneSite,
	initActiveProvidersFromLocalStorage,
	getEnabledProvidersHub,
	getSnapshotsForActiveSiteProviderHub,
	editSnapshotMetaData,
	restoreSite,
	setActiveProviderAndPersist,
	updateBackupProviderPersistAndUpdateSnapshots,
	updateActiveSite,
	updateActiveSiteAndDataSources,
};
