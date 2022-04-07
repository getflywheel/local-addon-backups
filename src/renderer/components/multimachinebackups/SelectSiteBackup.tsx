import {
	FlySelect,
	PrimaryButton,
	ProgressBar,
	Text,
	TextButton,
	Title,
	Tooltip,
} from "@getflywheel/local-components";
import * as LocalRenderer from "@getflywheel/local/renderer";
import classNames from "classnames";
import path from "path";
import React, { useCallback, useEffect, useState } from "react";
import {
	IPCASYNC_EVENTS,
	LOCAL_ROUTES,
	MULTI_MACHINE_BACKUP_ERRORS,
} from "../../../constants";
import { BackupSite, NewSiteInfoWithCloudMeta } from "../../../types";
import { selectors } from "../../store/selectors";
import { actions, store, useStoreSelector } from "../../store/store";
import { ErrorBannerContainer } from "./ErrorBannerContainer";
import styles from "./SelectSiteBackup.scss";

interface Props {
	siteSettings: NewSiteInfoWithCloudMeta;
	updateSiteSettings: (...any) => any;
	formatSiteNicename: (siteName: string) => string;
	defaultLocalSettings: any;
	osPath: any;
}

export const SelectSiteBackup = (props: Props) => {
	const {
		updateSiteSettings,
		siteSettings,
		osPath,
		formatSiteNicename,
		defaultLocalSettings,
	} = props;
	const [isDuplicateName, setIsDuplicateName] = useState(false);
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const {
		backupSites,
		selectedSite,
		newSiteName,
		isLoading,
		providerIsErrored,
		activeError,
	} = state;
	const [showBanner, setShowBanner] = useState(false);
	const noProvidersFound =
		activeError ===
		MULTI_MACHINE_BACKUP_ERRORS.NO_CONNECTED_PROVIDERS_FOR_SITE;
	const noConnectionToHub =
		activeError ===
		MULTI_MACHINE_BACKUP_ERRORS.GENERIC_HUB_CONNECTION_ERROR;

	useEffect(() => {
		console.log("state: ", state);
		store.dispatch(actions.setProviderIsErrored(null));
		store.dispatch(actions.setActiveError(null));
		store.dispatch(actions.getProvidersList());
		// TODO: Do we need to refactor getSitesList out so that it is fired after getProvidersList?
		store.dispatch(actions.getSitesList());
		const getUserDataShowPromoBanner = async () => {
			const showBanner = await LocalRenderer.ipcAsync(
				IPCASYNC_EVENTS.SHOULD_LOAD_PROMO_BANNER
			);

			if (showBanner && showBanner?.show === true) {
				setShowBanner(true);
			}
		};
		getUserDataShowPromoBanner();
	}, []);

	let flySelectSites: { [value: string]: string } = {};

	// create object required for select dropdown component
	backupSites.forEach((site) => {
		flySelectSites = {
			...flySelectSites,
			[site.uuid]: site.name,
		};
		return flySelectSites;
	});

	const generateSiteSettingsData = useCallback(() => {
		const { multiMachineRestore } = store.getState();
		const formattedSiteName = formatSiteNicename(
			multiMachineRestore.newSiteName
		);
		const formattedSiteDomain = `${formattedSiteName}${defaultLocalSettings["new-site-defaults"].tld}`;

		const sitePath = path.join(
			defaultLocalSettings["new-site-defaults"].sitesPath,
			formattedSiteName
		);

		const formattedSitePath = osPath.addOSTrailingSlash(
			osPath.toNative(sitePath)
		);

		return {
			formattedSiteName,
			formattedSiteDomain,
			formattedSitePath,
			siteName: multiMachineRestore.newSiteName,
		};
	}, [defaultLocalSettings]);

	useEffect(() => {
		updateSiteSettings({
			...siteSettings,
			siteName: newSiteName,
		});

		const checkSiteName = async () => {
			const isDuplicate = await LocalRenderer.ipcAsync(
				IPCASYNC_EVENTS.CHECK_FOR_DUPLICATE_NAME,
				newSiteName
			);

			setIsDuplicateName(isDuplicate);
		};

		// Wait 100ms after user has finished typing.
		const debouncer = setTimeout(() => {
			checkSiteName();
		}, 100);

		return () => {
			clearTimeout(debouncer);
		};
	}, [newSiteName]);

	const onSiteSelect = async (siteUUID: string) => {
		const site: BackupSite = backupSites.find(
			(site) => siteUUID === site.uuid
		);

		store.dispatch(actions.setSelectedSite(site));

		const newSiteSettings = generateSiteSettingsData();

		// updateSiteSettings is a function passed into props from local core
		// used to build out the new site object
		updateSiteSettings({
			...siteSettings,
			siteName: newSiteSettings.siteName,
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
		LocalRenderer.sendIPCEvent(
			"goToRoute",
			LOCAL_ROUTES.ADD_SITE_BACKUP_SNAPSHOT
		);
	};

	const onGoBack = () => {
		delete siteSettings.cloudBackupMeta;

		store.dispatch(actions.setSelectedSite(null));

		LocalRenderer.sendIPCEvent("goToRoute", LOCAL_ROUTES.ADD_SITE_START);
	};

	const continueDisabled =
		selectedSite === null || newSiteName === "" || isDuplicateName;

	if (isLoading) {
		return (
			<div className="AddSiteContent">
				<div className="Inner">
					<p>Authenticating connection and fetching sites...</p>
					<ProgressBar stripes />
				</div>
			</div>
		);
	}

	return (
		<>
			<ErrorBannerContainer />
			<div className="AddSiteContent">
				<Title size="l" container={{ margin: "l 0" }}>
					Select site with backup and name your new site
				</Title>
				<div className={styles.innerContainer}>
					<h2 className={styles.headerPadding}>
						Select a site with a Cloud Backup
					</h2>
					<div className="FormRow">
						<div className="FormField">
							<FlySelect
								onChange={(value) => onSiteSelect(value)}
								options={flySelectSites}
								emptyPlaceholder="No backups available"
								placeholder="Select a site"
								value={
									selectedSite ? selectedSite.uuid : undefined
								}
							/>
						</div>
					</div>
					<div className="FormRow __MarginTop_20 __MarginBottom_0">
						<div className="FormField">
							<label>Give the site a new unique name</label>
							<input
								className={classNames(
									"TID_NewSiteSite_Input_SiteName_Small",
									{ [styles.errorState]: isDuplicateName }
								)}
								type="text"
								disabled={selectedSite === null}
								value={newSiteName}
								onChange={(e) =>
									store.dispatch(
										actions.setNewSiteName(e.target.value)
									)
								}
							/>
							{isDuplicateName && (
								<div className={styles.errorTextContainer}>
									<Text className={styles.errorText}>
										Please give the site a unique name
									</Text>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* wrap button in tooltip if continue is disabled */}
				{continueDisabled ? (
					<Tooltip
						className={styles.tooltip}
						content={
							<>
								Please select a site and name it before
								continuing.
							</>
						}
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
				) : (
					<PrimaryButton
						className="Continue"
						onClick={onContinue}
						disabled={continueDisabled}
					>
						Continue
					</PrimaryButton>
				)}
				<TextButton className="GoBack" onClick={onGoBack}>
					Go Back
				</TextButton>
			</div>
		</>
	);
};
