import React, { useEffect, useState } from 'react';
import {
	PrimaryButton,
	RadioBlock,
	TextButton,
	Title,
	FlySelect,
	FlySelectOption,
	FlyDropdown,
} from '@getflywheel/local-components';
import { IPCASYNC_EVENTS } from '../../../constants';
import { ipcAsync } from '@getflywheel/local/renderer';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import * as LocalRenderer from '@getflywheel/local/renderer';

// interface Props {

// }

export const SelectSiteBackup = () => {
	useEffect(() => {
		const getSitesList = async () => {
			const allSites = await ipcAsync(
				IPCASYNC_EVENTS.GET_ALL_SITES,
			);

			store.dispatch(actions.setAllBackupSites(allSites));

			const availableProviders = await ipcAsync(
				IPCASYNC_EVENTS.MULTI_MACHINE_GET_AVAILABLE_PROVIDERS,
			);

			store.dispatch(actions.setSelectedProvider(availableProviders[0].id));
		};
		getSitesList();
	}, []);

	let flySelectSites: { [value: string]: string; } = {};

	const backupSites = useStoreSelector(selectors.selectAllBackupSites);

	backupSites.forEach((site) => {
		flySelectSites = {
			...flySelectSites,
			[site.uuid]: site.name,
		};
		return flySelectSites;
	});

	const onSiteSelect = (siteUUID: string) => {
		// dispatch uuid value to redux store
		store.dispatch(actions.setSelectedSite(siteUUID));
		// set "disabled" prop on continue button to 'false'
	};

	const onContinue = () => {
		LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/select-snapshot');
	};

	return (
		<div>
			<Title size="l" container={{ margin: 'l 0' }}>Select a site to restore</Title>
			<div className="Inner">
				<p>Select a site with a Cloud Backup</p>
				<FlySelect
					onChange={(value) => onSiteSelect(value)}
					options={flySelectSites}
				/>
			</div>
			<PrimaryButton
				className="Continue"
				onClick={onContinue}
			>
				Continue
			</PrimaryButton>
		</div>
	);
};
