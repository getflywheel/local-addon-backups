import React, { useEffect, useState } from 'react';
import { IPCASYNC_EVENTS } from '../../../constants';
import { ipcAsync } from '@getflywheel/local/renderer';
import {
	PrimaryButton,
	RadioBlock,
	TextButton,
	Title,
	FlySelect,
	FlySelectOption,
	FlyDropdown,
} from '@getflywheel/local-components';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import * as LocalRenderer from '@getflywheel/local/renderer';


// interface Props {

// }

export const SelectSnapshot = () => {
	const selectedProvider = useStoreSelector(selectors.selectEnabledProvider);
	const selectedBackupSite = useStoreSelector(selectors.selectBackupSite);

	useEffect(() => {
		const getSnapshotsList = async () => {
			if (selectedProvider && selectedBackupSite) {
				const allSnapshots = await ipcAsync(
					IPCASYNC_EVENTS.GET_ALL_SNAPSHOTS,
					selectedBackupSite,
					selectedProvider,
				);

				store.dispatch(actions.setBackupSnapshots(allSnapshots.snapshots));
			}
		};
		getSnapshotsList();
	}, []);

	return (
		<div>
			Hello World
		</div>
	);
};
