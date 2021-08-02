import React from 'react';
import {
	Banner,
} from '@getflywheel/local-components';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import styles from './ErrorBannerContainer.scss';
import { SerializedError } from '@reduxjs/toolkit';
import { MULTI_MACHINE_BACKUP_ERRORS } from '../../../constants';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';

export const ErrorBannerContainer = () => {
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const { isErrored, activeError } = state;
	let bannerText = null as SerializedError;

	if (!isErrored) {
		return null;
	}

	if (activeError) {
		switch (activeError) {
			case MULTI_MACHINE_BACKUP_ERRORS.NO_PROVIDERS_FOUND:
			case MULTI_MACHINE_BACKUP_ERRORS.NO_SITES_FOUND:
			case MULTI_MACHINE_BACKUP_ERRORS.NO_CONNECTED_PROVIDERS_FOR_SITE:
			case MULTI_MACHINE_BACKUP_ERRORS.NO_SNAPSHOTS_FOUND:
				bannerText = activeError;
				break;
			default:
				bannerText = MULTI_MACHINE_BACKUP_ERRORS.GENERIC_HUB_CONNECTION_ERROR as SerializedError;
				break;
		}
	}

	const handleOnDismiss = () => {
		store.dispatch(actions.setIsErrored(false));
	};

	return (
		<div className={styles.bannerContainer}>
			<Banner
				variant='error'
				icon='warning'
				onDismiss={handleOnDismiss}
				buttonText='Go to account'
				buttonOnClick={launchBrowserToHubBackups}
			>
				{bannerText}
			</Banner>
		</div>
	);
};
