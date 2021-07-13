import React, { useState } from 'react';
import { ipcAsync } from '@getflywheel/local/renderer';
import {
	FlyModal,
	Title,
	PrimaryButton,
	TextButton,
	BasicInput,
	Text
} from '@getflywheel/local-components';
import type { Site } from '@getflywheel/local';
import styles from './BackupContents.scss';
import { BackupSnapshot, HubProviderRecord, Providers } from '../../../types';
import { hubProviderRecordToProvider } from '../../helpers/hubProviderToProvider';
import { actions, store } from '../../store/store';
import { IPCASYNC_EVENTS } from '../../../constants';
import WarningIcon from '../../assets/warning-icon.svg';

interface ModalContentsProps {
	site: Site;
	snapshot: BackupSnapshot;
	provider: HubProviderRecord;
}

const onCloneModalSubmit = (baseSite: Site, newSiteName: string, provider: Providers, snapshotHash: string) => {
	store.dispatch(actions.cloneSite({ baseSite, newSiteName, provider, snapshotHash }));
};

export const BackupCloneContents = (props: ModalContentsProps) => {
	const [inputSiteNameData, setSiteNameData] = useState('');
	const [isDuplicateName, setIsDuplicateName] = useState(false);

	const { site, snapshot, provider } = props;

	const providerRecordConvertedToProvider = hubProviderRecordToProvider(provider);

	const checkForDuplicateSiteName = async (siteName: string) =>
		await ipcAsync(
			IPCASYNC_EVENTS.CHECK_FOR_DUPLICATE_NAME,
			siteName,
		);

	const onInputChange = async (event) => {
		const siteName = event.target.value;
		setSiteNameData(siteName);
		const isDuplicate = await checkForDuplicateSiteName(siteName);
		setIsDuplicateName(isDuplicate);
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
				<BasicInput className={isDuplicateName && styles.ErrorState} value={inputSiteNameData} onChange={onInputChange} />
				{isDuplicateName &&
				<Text className={styles.ErrorText}>
					<WarningIcon className={styles.ErrorIcon} />
					Site name already exists. Please choose a unique site name.
				</Text>
				}

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
					disabled={!inputSiteNameData || isDuplicateName}
				>
					Create Clone
				</PrimaryButton>
			</div>
		</div>
	);
};
