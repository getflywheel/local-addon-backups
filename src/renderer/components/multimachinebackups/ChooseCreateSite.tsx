import React, { useState } from 'react';
import {
	PrimaryButton,
	RadioBlock,
	Title,
	ProgressBar,
	Banner,
} from '@getflywheel/local-components';
import * as LocalRenderer from '@getflywheel/local/renderer';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import styles from './ChooseCreateSite.scss';
import { ErrorBannerContainer } from './ErrorBannerContainer';

export const ChooseCreateSite = () => {
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const { isLoading } = state;
	const [radioState, setRadioState] = useState('createnew');

	const onContinue = () => {
		if (radioState === 'createnew') {
			// todo - tyler - update all these routes to use constants within the addon
			LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/add');
		}

		if (radioState === 'usebackup') {
			store.dispatch(actions.getSitesList());
		}
	};

	const onPromoBannerDismiss = () => {
		console.log('test');
	}

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
							},
						}}
					/>
					<Banner
						className={styles.promoBanner}
						variant="neutral"
						onDismiss={onPromoBannerDismiss}
						icon="none"
					>
						<p>&#127881; You can now restore a site from a Cloud Backup! Select to restore a site to get started.</p>
					</Banner>
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
