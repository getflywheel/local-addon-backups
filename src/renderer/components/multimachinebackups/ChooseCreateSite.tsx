import React, { useState, useEffect, useCallback } from 'react';
import {
	PrimaryButton,
	RadioBlock,
	Title,
	ProgressBar,
	Banner,
	Tooltip,
	TextButton,
	FlyModal,
} from '@getflywheel/local-components';
import * as LocalRenderer from '@getflywheel/local/renderer';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import styles from './ChooseCreateSite.scss';
import { LOCAL_ROUTES, IPCASYNC_EVENTS, MULTI_MACHINE_BACKUP_ERRORS } from '../../../constants';
import { launchBrowserToHubBackups, launchBrowserToHubLogin } from '../../helpers/launchBrowser';

export const ChooseCreateSite = (props) => {
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const { isLoading, providerIsErrored, activeError } = state;
	const [radioState, setRadioState] = useState('createnew');
	const [showBanner, setShowBanner] = useState(false);
	const noProvidersFound = activeError === MULTI_MACHINE_BACKUP_ERRORS.NO_CONNECTED_PROVIDERS_FOR_SITE;
	const noConnectionToHub = activeError === MULTI_MACHINE_BACKUP_ERRORS.GENERIC_HUB_CONNECTION_ERROR;

	// Helper to close the add site modal, then call launch method.
	const closeThenLaunch = useCallback((launchMethod) => () => {
		LocalRenderer.sendIPCEvent('goToRoute', '/main');
		launchMethod();
	}, [props.onClose]);

	useEffect(() => {
		store.dispatch(actions.setProviderIsErrored(null));
		store.dispatch(actions.setActiveError(null));
		store.dispatch(actions.getProvidersList());
		const getUserDataShowPromoBanner = async () => {
			const showBanner = await LocalRenderer.ipcAsync(IPCASYNC_EVENTS.SHOULD_LOAD_PROMO_BANNER);

			if (showBanner && showBanner?.show === true) {
				setShowBanner(true);
			}
		};
		getUserDataShowPromoBanner();
	}, []);

	const onContinue = () => {
		if (radioState === 'createnew') {
			LocalRenderer.sendIPCEvent('goToRoute', LOCAL_ROUTES.ADD_SITE_CREATE_NEW);
		}

		if (radioState === 'usebackup') {
			LocalRenderer.sendIPCEvent('goToRoute', LOCAL_ROUTES.ADD_SITE_BACKUP_SITE);
		}
	};

	const onPromoBannerDismiss = async () => {
		await LocalRenderer.ipcAsync(IPCASYNC_EVENTS.REMOVE_PROMO_BANNER);
		setShowBanner(false);
	};

	if (isLoading) {
		return (
			<div className="AddSiteContent">
				<div className="Inner">
					<p>Authenticating connection...</p>
					<ProgressBar stripes />
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="AddSiteContent">
				<Title size="l" container={{ margin: 'l 0' }}>Create a site</Title>
				<div className="Inner">
					<RadioBlock
						className={styles.radioBlock}
						onChange={(name) => setRadioState(name)}
						default={radioState}
						options={{
							createnew: {
								key: 'create-new-site',
								label: 'Create a new site',
							},
							usebackup: {
								key: 'use-cloud-backup',
								label: 'Create a site from Cloud Backups Add-on',
								className: 'TID_NewSiteEnvironment_RadioBlockItem_Custom',
								disabled: providerIsErrored,
								container: {
									element:
									(providerIsErrored
										? <Tooltip
											className={styles.tooltip}
											showDelay={2}
											content={(
												<div>
													{noProvidersFound && [
														<p className={styles.extraPadding}>
															Uh oh!
															<br/>
															You don’t have a
															storage provider
															connected to your account.
														</p>,
														<TextButton onClick={closeThenLaunch(launchBrowserToHubBackups)}>Manage Account</TextButton>,
													]}
													{noConnectionToHub && [
														<p className={styles.extraPadding}>
															Uh oh!
															<br/>
															We couldn't connect
															to your Local account.
														</p>,
														<TextButton onClick={closeThenLaunch(launchBrowserToHubLogin)}>Log in to Local</TextButton>,
													]}

												</div>
											)}
											popperOffsetModifier={{ offset: [0, 12] }}
											position="top"
										/>
										: <></>
									),
								},
							},
						}}
					/>
					{showBanner && <Banner
						className={styles.promoBanner}
						variant="neutral"
						onDismiss={onPromoBannerDismiss}
						icon="none"
					>
						<p>&#127881;</p><p>You can now create a site from a Cloud Backup! Select this option to get started.</p>
					</Banner>}
				</div>
				<PrimaryButton
					className="Continue"
					onClick={onContinue}
				>
					Continue
				</PrimaryButton>
			</div>
		</>
	);
};
