import React from 'react';
import {
	PrimaryButton,
	Title,
	FlySelect,
	TextButton,
	Tooltip,
} from '@getflywheel/local-components';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import * as LocalRenderer from '@getflywheel/local/renderer';
import path from 'path';
import { BackupSite, NewSiteInfoWithCloudMeta } from '../../../types';
import { ErrorBannerContainer } from './ErrorBannerContainer';
import styles from './SelectSiteBackup.scss';

interface Props {
	siteSettings: NewSiteInfoWithCloudMeta
	updateSiteSettings: (...any) => any
	formatSiteNicename: (siteName: string) => string
	defaultLocalSettings: any
	osPath: any
}

export const SelectSiteBackup = (props: Props) => {
	const { updateSiteSettings, siteSettings, osPath, formatSiteNicename, defaultLocalSettings } = props;
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const { backupSites, selectedSite } = state;

	let flySelectSites: { [value: string]: string; } = {};

	backupSites.forEach((site) => {
		flySelectSites = {
			...flySelectSites,
			[site.uuid]: site.name,
		};
		return flySelectSites;
	});

	const generateSiteSettingsData = (site: BackupSite) => {
		const formattedSiteName = `${formatSiteNicename(site.name)}-clone`;

		const formattedSiteDomain = `${formattedSiteName}${defaultLocalSettings['new-site-defaults'].tld}`;

		const sitePath = path.join(defaultLocalSettings['new-site-defaults'].sitesPath, formattedSiteName);

		const formattedSitePath = osPath.addOSTrailingSlash(
			osPath.toNative(sitePath),
		);

		return {
			formattedSiteName,
			formattedSiteDomain,
			formattedSitePath,
		};
	};

	const onSiteSelect = async (siteUUID: string) => {
		const site: BackupSite = backupSites.find((site) => siteUUID === site.uuid);

		// save site object to redux
		store.dispatch(actions.setSelectedSite(site));

		const newSiteSettings = generateSiteSettingsData(site);

		// updateSiteSettings is a function passed into props from local core
		// used to build out the new site object
		updateSiteSettings({
			...siteSettings,
			siteName: newSiteSettings.formattedSiteName,
			siteDomain: newSiteSettings.formattedSiteDomain,
			sitePath: newSiteSettings.formattedSitePath,
			cloudBackupMeta: {
				createdFromCloudBackup: true,
				repoID: siteUUID,
			},
		});
	};

	const onContinue = () => {
		store.dispatch(actions.getSnapshotList());
		// todo - tyler - replace route with constant
		LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/select-snapshot');
	};

	const onGoBack = () => {
		delete siteSettings.cloudBackupMeta;

		LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site');
	};

	const continueDisabled = (selectedSite === null);

	return (
		<>
			<ErrorBannerContainer />
			<div className="AddSiteContent">
				<Title size="l" container={{ margin: 'l 0' }}>Select a site to restore</Title>
				<div className={styles.innerContainer}>
					<h2 className={styles.headerPadding}>Select a site with a Cloud Backup</h2>
					<div className="FormRow">
						<div className="FormField">
							<FlySelect
								onChange={(value) => onSiteSelect(value)}
								options={flySelectSites}
								emptyPlaceholder="No backups available"
								placeholder="Select a site"
							/>
						</div>
					</div>
				</div>

				{/* wrap button in tooltip if continue is disabled */}
				{continueDisabled
					?
					<Tooltip
						className={styles.tooltip}
						content={(
							<>
								Please select a site before continuing.
							</>
						)}
						popperOffsetModifier={{ offset: [0, 0] }}
						position="top-start"
					>
						<PrimaryButton
							className="Continue"
							onClick={onContinue}
							disabled={continueDisabled}
						>
						Continue
						</PrimaryButton>
					</Tooltip>
					:
					<PrimaryButton
						className="Continue"
						onClick={onContinue}
						disabled={continueDisabled}
					>
						Continue
					</PrimaryButton>
				}
				<TextButton
					className="GoBack"
					onClick={onGoBack}
				>
					Go Back
				</TextButton>
			</div>
		</>
	);
};
