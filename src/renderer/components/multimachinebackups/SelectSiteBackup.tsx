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
import * as Local from '@getflywheel/local';
import path from 'path';

interface Props {
	siteSettings: Local.NewSiteInfo
	updateSiteSettings: (...any) => any
	formatSiteNicename: (siteName: string) => string
	defaultLocalSettings: any
	osPath: any
}

export const SelectSiteBackup = (props: Props) => {
	const { updateSiteSettings, siteSettings, osPath, formatSiteNicename, defaultLocalSettings} = props;

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

	const backupSites = useStoreSelector(selectors.selectAllBackupSites);
	const selectedSite = useStoreSelector(selectors.selectBackupSite);

	let flySelectSites: { [value: string]: string; } = {};

	backupSites.forEach((site) => {
		flySelectSites = {
			...flySelectSites,
			[site.uuid]: site.name,
		};
		return flySelectSites;
	});

	const onSiteSelect = async (siteUUID: string) => {
		const selectedSite = backupSites.find((site) => siteUUID === site.uuid);

		store.dispatch(actions.setSelectedSite(selectedSite));

		const formattedSiteName = `${formatSiteNicename(selectedSite.name)}-clone`;

		const formattedSiteDomain = `${formattedSiteName}${defaultLocalSettings['new-site-defaults'].tld}`;

		const sitePath = path.join(defaultLocalSettings['new-site-defaults'].sitesPath, formattedSiteName);

		const formattedSitePath = osPath.addOSTrailingSlash(
			osPath.toNative(sitePath),
		);

		updateSiteSettings({
			...siteSettings,
			siteName: formattedSiteName,
			siteDomain: formattedSiteDomain,
			sitePath: formattedSitePath,
		});
	};

	const onContinue = () => {
		LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/select-snapshot');
	};

	const continueDisabled = (selectedSite === null);

	return (
		<div className="AddSiteContent">
			<Title size="l" container={{ margin: 'l 0' }}>Select a site to restore</Title>
			<div className="Inner">
				<h3>Select a site with a Cloud Backup</h3>
				<div className="FormField">
					<FlySelect
						onChange={(value) => onSiteSelect(value)}
						options={flySelectSites}
						emptyPlaceholder="No backups available"
						placeholder="Select a site"
					/>
				</div>
			</div>
			<PrimaryButton
				className="Continue"
				onClick={onContinue}
				disabled={continueDisabled}
			>
				Continue
			</PrimaryButton>
		</div>
	);
};
