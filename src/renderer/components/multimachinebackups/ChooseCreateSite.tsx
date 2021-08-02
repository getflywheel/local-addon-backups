import React, { useState, useEffect } from 'react';
import {
	PrimaryButton,
	RadioBlock,
	Title,
	ProgressBar,
	Banner,
	Tooltip,
	TextButton,
} from '@getflywheel/local-components';
import * as LocalRenderer from '@getflywheel/local/renderer';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import styles from './ChooseCreateSite.scss';
import { ErrorBannerContainer } from './ErrorBannerContainer';
import { LOCAL_ROUTES, IPCASYNC_EVENTS } from '../../../constants';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';

export const ChooseCreateSite = () => {
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const { isLoading, isErrored } = state;
	const [radioState, setRadioState] = useState('createnew');
	const [showBanner, setShowBanner] = useState(false);

	useEffect(() => {
		store.dispatch(actions.getProvidersList());
		const getUserDataShowPromoBanner = async () => {
			const showBanner = await LocalRenderer.ipcAsync(IPCASYNC_EVENTS.SHOULD_LOAD_PROMO_BANNER);

			if (showBanner.show === true) {
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
			store.dispatch(actions.getSitesList());
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
					<p>Authenticating connection and fetching sites...</p>
					<ProgressBar stripes />
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="AddSiteContent">
				<Title size="l" container={{ margin: 'l 0' }}>Select the type of site you want to add</Title>
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
								label: 'Restore a site from Cloud Backups Add-on',
								className: 'TID_NewSiteEnvironment_RadioBlockItem_Custom',
								disabled: isErrored,
								container: {
									element:
									<Tooltip
										className={styles.tooltip}
										showDelay={2}
										content={(
											<div>
												<p>Uh oh! You don’t have a
													<br/>
													storage provider
													<br/>
													connected to your account.
												</p>
												<TextButton onClick={launchBrowserToHubBackups}>Manage providers</TextButton>
											</div>
										)}
										popperOffsetModifier={{ offset: [0, 10] }}
										position="top"
									/>,
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
						<p>&#127881;</p><p>You can now restore a site from a Cloud Backup! Select to restore a site to get started.</p>
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
