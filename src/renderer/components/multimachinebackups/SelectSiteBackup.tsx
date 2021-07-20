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

// interface Props {

// }

export const SelectSiteBackup = () => {
	useEffect(() => {
		const getSitesList = async () => {
			const bleeb = await ipcAsync(
				IPCASYNC_EVENTS.GET_ALL_SITES,
			);
			console.log(bleeb);
		};
		getSitesList();
	}, []);

	return (
		<div>
			<Title size="l" container={{ margin: 'l 0' }}>Select a site to restore</Title>
		</div>
	);
};
