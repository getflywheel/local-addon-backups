import React from 'react';
import {
	Banner,
} from '@getflywheel/local-components';
import { useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import styles from './ErrorBannerContainer.scss';
import { SerializedError } from '@reduxjs/toolkit';
import { MULTI_MACHINE_BACKUP_ERRORS } from '../../../constants';

// interface Props {

// }

export const ErrorBannerContainer = () => {
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const { isErrored, activeError } = state;
	let bannerText = null as SerializedError;

	if (!isErrored) {
		return null;
	}
	console.log(activeError);
	if (activeError) {
		switch (activeError) {
			case MULTI_MACHINE_BACKUP_ERRORS.NO_PROVIDERS_FOUND:
				bannerText = activeError;
				break;
			case MULTI_MACHINE_BACKUP_ERRORS.NO_SITES_FOUND:
				bannerText = activeError;
				break;
			case MULTI_MACHINE_BACKUP_ERRORS.NO_CONNECTED_PROVIDERS_FOR_SITE:
				bannerText = activeError;
				break;
			case MULTI_MACHINE_BACKUP_ERRORS.NO_SNAPSHOTS_FOUND:
				bannerText = activeError;
				break;
			default:
				bannerText = 'We could not authenticate your connection. Please verify you are logged into your account and try again.' as SerializedError;
				break;
		}
	}

	// 'We could not fetch your sites. Please verify you're logged into your Local account and try again.'
	// 'We could not authenticate your connection. Please verify you are logged into your account and try again.'
	// 'There was an error retrieving your Cloud Backups. Please verify your account is connected to a storage provider and try again.'
	return (
		<div className={styles.bannerContainer}>
			<Banner variant='error' icon='warning'>{bannerText}</Banner>
		</div>
	);
};
