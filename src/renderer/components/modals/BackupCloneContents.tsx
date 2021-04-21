import React, { useState } from 'react';
import {
	FlyModal,
	Title,
	PrimaryButton,
	TextButton,
	BasicInput,
} from '@getflywheel/local-components';
import type { Site } from '@getflywheel/local';
import styles from './BackupContents.scss';
import { BackupSnapshot, HubProviderRecord, Providers } from '../../../types';
import { hubProviderRecordToProvider } from '../../helpers/hubProviderToProvider';
import { ipcAsync } from '@getflywheel/local/renderer';
import { IPCASYNC_EVENTS } from '../../../constants';

interface ModalContentsProps {
	site: Site;
	snapshot: BackupSnapshot;
	provider: HubProviderRecord;
}

const onCloneModalSubmit = (baseSite: Site, newSiteName: string, provider: Providers, snapshotHash: string) => {
	ipcAsync(
		IPCASYNC_EVENTS.CLONE_BACKUP,
		baseSite,
		newSiteName,
		provider,
		snapshotHash,
	);
};

export const BackupCloneContents = (props: ModalContentsProps) => {
	const [inputSiteNameData, setSiteNameData] = useState('');

	const { site, snapshot, provider } = props;

	const providerRecordConvertedToProvider = hubProviderRecordToProvider(provider);

	const onInputChange = (event) => {
		setSiteNameData(event.target.value);
	};

	const onModalSubmit = () => {
		onCloneModalSubmit(site, inputSiteNameData, providerRecordConvertedToProvider, snapshot.hash);
		FlyModal.onRequestClose();
	};

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>Create a clone of "{site.name}"</Title>
			<p style={{ marginTop: 7 }}>We’ll create a new site that is an exact clone of your site at the time this Cloud Backup was created.</p>

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
