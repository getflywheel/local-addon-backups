import React, { useState } from 'react';
import {
	PrimaryButton,
	RadioBlock,
	TextButton,
	Title,
	FlySelect,
	FlySelectOption,
} from '@getflywheel/local-components';
import * as LocalRenderer from '@getflywheel/local/renderer';

// interface Props {

// }

export const ChooseCreateSite = () => {
	const [radioState, setRadioState] = useState('createnew');

	const onContinue = () => {
		if (radioState === 'createnew') {
			LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/add');
		}

		if (radioState === 'usebackup') {
			LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/select-site-backup');
		}
	};

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
				className="TID_NewSiteEnvironment_Button_Continue Continue"
				onClick={onContinue}
			>
				Continue
			</PrimaryButton>
		</div>
	);
};
