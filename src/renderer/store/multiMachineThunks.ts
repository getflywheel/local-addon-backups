import { createAsyncThunk } from '@reduxjs/toolkit';
import { IPCASYNC_EVENTS } from '../../constants';
import { ipcAsync } from '@getflywheel/local/renderer';
import type { AppState } from './store';

import * as LocalRenderer from '@getflywheel/local/renderer';
import { BackupRepo, HubProviderRecord } from '../../types';


const getSitesList = createAsyncThunk('multiMachineBackupsGetSites', async () => {
	try {
		const availableProviders = await ipcAsync(
			IPCASYNC_EVENTS.MULTI_MACHINE_GET_AVAILABLE_PROVIDERS,
		);

		const allSites = await ipcAsync(
			IPCASYNC_EVENTS.GET_ALL_SITES,
		);

		LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/select-site-backup');

		return { availableProviders, allSites };
	} catch (error) {
		console.log(error);
		// throw warning banner
		return error;
	}
});

const getSnapshotList = createAsyncThunk('multiMachineBackupsGetSnapshots', async (_, { getState }) => {
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

			return {
				snapshots,
				individualSiteProviders,
			};
		}
	} catch (error) {
		console.log(error);
		// throw warning banner
		return error;
	}
});

const setMultiMachineProviderAndUpdateSnapshots = createAsyncThunk('multiMachineBackupsSetProviderAndUpdateSnapshots',
	async (provider: HubProviderRecord, { getState }) => {
		const state = getState() as AppState;
		const { selectedSite } = state.multiMachineRestore;

		try {
			const snapshots = await ipcAsync(
				IPCASYNC_EVENTS.GET_ALL_SNAPSHOTS,
				selectedSite.uuid,
				provider.id,
			);

			return {
				snapshots,
				provider,
			};
		} catch (error) {
			console.log(error);
			// throw warning banner
			return error;
		}
	});

export {
	getSitesList,
	getSnapshotList,
	setMultiMachineProviderAndUpdateSnapshots,
};
