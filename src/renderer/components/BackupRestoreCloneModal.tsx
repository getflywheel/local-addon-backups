import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import {
	FlyModal,
	Title,
	PrimaryButton,
	TextButton,
	BasicInput,
} from '@getflywheel/local-components';
import type { Site } from '@getflywheel/local';
import classnames from 'classnames';
import styles from './BackupInfoModal.scss';
import { BackupSnapshot, HubProviderRecord, Providers } from '../../types';
import { hubProviderRecordToProvider } from '../helpers/hubProviderToProvider';
import { ipcAsync } from '@getflywheel/local/renderer';

interface ModalContentsProps {
	site: Site;
	snapshot: BackupSnapshot;
	provider: Providers;
}

const onCloneModalSubmit = (baseSite: Site, newSiteName: string, provider: Providers, snapshotHash: string) => {
	ipcAsync(
		'backups:restore-site-clone',
		baseSite,
		newSiteName,
		provider,
		snapshotHash,
	);
};

export const ModalContents = (props: ModalContentsProps) => {
	const [inputSiteNameData, setSiteNameData] = useState('');

	const { site, snapshot, provider } = props;

	const onInputChange = (event) => {
		setSiteNameData(event.target.value);
	};

	const onModalSubmit = () => {
		onCloneModalSubmit(site, inputSiteNameData, provider, snapshot.hash);
		FlyModal.onRequestClose();
	};

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>Create a clone of "{site.name}"</Title>
			<p style={{ marginTop: 7 }}>We’ll create a new site that is an exact clone of your site at the time this backup was created.</p>

			<hr />

			<div className={styles.AlignLeft}>

				<Title size="m" style={{ paddingBottom: 15, paddingTop: 15 }}>Enter a name for the new site</Title>
				<BasicInput value={inputSiteNameData} onChange={onInputChange} />

			</div>

			<hr />

			<div className={styles.ModalButtons}>
				<TextButton
					style={{ marginTop: 0 }}
					className={styles.NoPaddingLeft}
					onClick={FlyModal.onRequestClose}
				>
					Cancel
				</TextButton>

				<PrimaryButton
					style={{ marginTop: 0 }}
					onClick={() => onModalSubmit()}
				>
					Create Clone
				</PrimaryButton>
			</div>
		</div>
	);
};

export const createBackupCloneModal = (
	site: Site,
	snapshot: BackupSnapshot,
	provider: HubProviderRecord,
) => new Promise((resolve) => {

	const onSubmit = (checked) => {
		FlyModal.onRequestClose();

		resolve(checked);
	};

	const newProvider = hubProviderRecordToProvider(provider);

	ReactDOM.render(
		<FlyModal
			contentLabel='Back up site'
			className={classnames('FlyModal')}
		>
			<ModalContents
				site={site}
				snapshot={snapshot}
				provider={newProvider}
			/>
		</FlyModal>,
		document.getElementById('popup-container'),
	);
});
