import React, { useEffect } from 'react';
import {
	PrimaryButton,
	RadioBlock,
	TextButton,
	Title,
	FlySelect,
	FlySelectOption,
} from '@getflywheel/local-components';
import { IPCASYNC_EVENTS } from '../../../constants';
import { ipcAsync } from '@getflywheel/local/renderer';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';


// interface Props {

// }

export const SelectSiteBackup = () => {
	useEffect(() => {
		const getSitesList = async () => {
			const bleeb = await ipcAsync(
				IPCASYNC_EVENTS.GET_ALL_SITES,
			);

			store.dispatch(actions.setAllBackupSites(bleeb));
		};
		getSitesList();
	}, []);

	const backupSites = useStoreSelector(selectors.selectAllBackupSites);

	console.log(backupSites, 'tylers state');

	return (
		<div>
			<Title size="l" container={{ margin: 'l 0' }}>Select a site to restore</Title>
		</div>
	);
};
