import React, { useState } from 'react';
import {
	PrimaryButton,
	RadioBlock,
	Title,
	ProgressBar,
} from '@getflywheel/local-components';
import * as LocalRenderer from '@getflywheel/local/renderer';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';

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
		<div className="AddSiteContent">
			<Title size="l" container={{ margin: 'l 0' }}>Select the type of site you want to add</Title>
			<div className="Inner">
				<RadioBlock
					onChange={(name) => setRadioState(name)}
					default={radioState}
					options={{
						createnew: {
							label: 'Create a new site',
						},
						usebackup: {
							label: 'Restore a site from Cloud Backups Add-on',
							className: 'TID_NewSiteEnvironment_RadioBlockItem_Custom',
						},
					}}
				/>
				{}
			</div>
			<PrimaryButton
				className="Continue"
				onClick={onContinue}
			>
				Continue
			</PrimaryButton>
		</div>
	);
};
