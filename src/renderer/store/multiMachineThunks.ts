import { createAsyncThunk } from '@reduxjs/toolkit';
import { IPCASYNC_EVENTS, LOCAL_ROUTES, MULTI_MACHINE_BACKUP_ERRORS } from '../../constants';
import { ipcAsync } from '@getflywheel/local/renderer';
import type { AppState } from './store';

import * as LocalRenderer from '@getflywheel/local/renderer';
import { BackupRepo, HubProviderRecord } from '../../types';


const getSitesList = createAsyncThunk('multiMachineBackupsGetSites', async (_, { rejectWithValue }) => {
	try {
		const availableProviders = await ipcAsync(
			IPCASYNC_EVENTS.MULTI_MACHINE_GET_AVAILABLE_PROVIDERS,
		);

		const allSites = await ipcAsync(
			IPCASYNC_EVENTS.GET_ALL_SITES,
		);

		if (!availableProviders.length) {
			return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.NO_PROVIDERS_FOUND);
		}

		if (!allSites.length) {
			return rejectWithValue(MULTI_MACHINE_BACKUP_ERRORS.NO_SITES_FOUND);
		}

		LocalRenderer.sendIPCEvent('goToRoute', LOCAL_ROUTES.ADD_SITE_BACKUP_SITE);

		return { availableProviders, allSites };
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

		// query repo by site id
		const siteRepos = await ipcAsync(
			IPCASYNC_EVENTS.GET_REPOS_BY_SITE_ID,
			selectedSite.id,
		);

		// determine if the site the user has selected has snapshots on multiple providers
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
	getSnapshotList,
	setMultiMachineProviderAndUpdateSnapshots,
	requestSubsequentSnapshots,
};
