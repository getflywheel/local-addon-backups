import { createAsyncThunk } from '@reduxjs/toolkit';
import * as LocalRenderer from '@getflywheel/local/renderer';
import { ipcAsync } from '@getflywheel/local/renderer';
import type { AppState } from './store';
import { BackupRepo, HubProviderRecord } from '../../types';
import { IPCASYNC_EVENTS, MULTI_MACHINE_BACKUP_ERRORS } from '../../constants';


const getProvidersList = createAsyncThunk('multiMachineBackupsGetProviders', async (_, { rejectWithValue }) => {
	try {
		const availableProviders = await LocalRenderer.ipcAsync(
			IPCASYNC_EVENTS.MULTI_MACHINE_GET_AVAILABLE_PROVIDERS,
		);

		// presence of a message on the response object means we got a connection error
		if (availableProviders.message) {
			return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.GENERIC_HUB_CONNECTION_ERROR);
		}

		if (!availableProviders[0]) {
			return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.NO_CONNECTED_PROVIDERS_FOR_SITE);
		}

		return { availableProviders };
	} catch (error) {
		return rejectWithValue(error.toString());
	}
});

const getSitesList = createAsyncThunk('multiMachineBackupsGetSites', async (_, { rejectWithValue }) => {
	try {
		const allSites = await ipcAsync(
			IPCASYNC_EVENTS.GET_ALL_SITES,
		);

		// presence of a message on the response object means we got a connection error
		if (allSites.message) {
			return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.GENERIC_HUB_CONNECTION_ERROR);
		}

		if (!allSites.length) {
			return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.NO_SITES_FOUND);
		}

		return { allSites };
	} catch (error) {
		return rejectWithValue(error.toString());
	}
});

const getSnapshotList = createAsyncThunk('multiMachineBackupsGetSnapshots', async (
	_, { getState, rejectWithValue },
) => {
	try {
		const state = getState() as AppState;
		const { backupProviders, selectedSite } = state.multiMachineRestore;

		// return all repos that have a backup of the selected site's ID
		const siteRepos = await ipcAsync(
			IPCASYNC_EVENTS.GET_REPOS_BY_SITE_ID,
			selectedSite.id,
		);

		// check all available providers to see if they match the siteRepos
		// we only want to return the providers that have a backup of the selected site
		const individualSiteProviders = backupProviders.filter((provider) => {
			const matchedRepoToProvider = siteRepos.find((repo: BackupRepo) => repo.providerID === provider.id);
			if (matchedRepoToProvider) {
				return matchedRepoToProvider;
			}
		});

		if (individualSiteProviders.length) {
			const snapshots = await ipcAsync(
				IPCASYNC_EVENTS.GET_ALL_SNAPSHOTS,
				selectedSite.uuid,
				individualSiteProviders[0].id,
			);

			if (!snapshots.snapshots.length) {
				return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.NO_SNAPSHOTS_FOUND);
			}

			return {
				snapshots,
				individualSiteProviders,
			};
		}

		return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.NO_CONNECTED_PROVIDERS_FOR_SITE);
	} catch (error) {
		return rejectWithValue(error.toString());
	}
});

const setMultiMachineProviderAndUpdateSnapshots = createAsyncThunk('multiMachineBackupsSetProviderAndUpdateSnapshots',
	async (provider: HubProviderRecord, { getState, rejectWithValue }) => {
		const state = getState() as AppState;
		const { selectedSite } = state.multiMachineRestore;

		try {
			const snapshots = await ipcAsync(
				IPCASYNC_EVENTS.GET_ALL_SNAPSHOTS,
				selectedSite.uuid,
				provider.id,
			);

			if (!snapshots.snapshots.length) {
				return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.NO_SNAPSHOTS_FOUND);
			}

			return {
				snapshots,
				provider,
			};
		} catch (error) {
			return rejectWithValue(error.toString());
		}
	});

const requestSubsequentSnapshots = createAsyncThunk('multiMachineBackupsRequestSubsequentSnapshots',
	async (_, { getState, rejectWithValue }) => {
		const state = getState() as AppState;
		const { selectedSite, currentSnapshotsPage, selectedProvider } = state.multiMachineRestore;
		const nextPage = currentSnapshotsPage + 1;
		try {
			const snapshots = await ipcAsync(
				IPCASYNC_EVENTS.GET_ALL_SNAPSHOTS,
				selectedSite.uuid,
				selectedProvider.id,
				nextPage,
			);

			if (!snapshots.snapshots.length) {
				return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.NO_SNAPSHOTS_FOUND);
			}

			return {
				snapshots,
			};
		} catch (error) {
			return rejectWithValue(error.toString());
		}
	},
);

export {
	getSitesList,
	getProvidersList,
	getSnapshotList,
	setMultiMachineProviderAndUpdateSnapshots,
	requestSubsequentSnapshots,
};
