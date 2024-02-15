import React, { useEffect, useState } from 'react';
import {
	CopyButton,
	FlyModal,
	Title,
	PrimaryButton,
	TextButton,
	BasicInput,
	Spinner,
} from '@getflywheel/local-components';
import type { Site } from '@getflywheel/local';
import styles from './BackupContents.scss';
import { fetchSiteSizeInMB } from './fetchSiteSizeInMB';
import { getIgnoreFilePath } from '../../../helpers/ignoreFilesPattern';
import { INPUT_MAX } from '../../../constants';

export interface ModalContentsProps {
	submitAction: (description) => void;
	site: Site;
	hasSnapshots: boolean;
}

export const BackupContents = (props: ModalContentsProps) => {
	const { submitAction, site, hasSnapshots } = props;
	const ignoreFilePath = getIgnoreFilePath(site);

	const [siteSizeInMB, setSiteSizeInMB] = useState(0);
	const [inputDescriptionData, setInputData] = useState('');

	useEffect(() => {
		fetchSiteSizeInMB(site).then(
			(siteSize) => setSiteSizeInMB(siteSize),
		);
	}, []);

	const onInputChange = (event) => {
		setInputData(event.target.value);
	};

	const onModalSubmit = () => {
		submitAction(inputDescriptionData);
		FlyModal.onRequestClose();
	};

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>Back up site</Title>

			<hr />
			<div className={styles.AlignLeft}>
				{ !hasSnapshots &&
				<div>
					<Title size="m" className="align-left">
						Estimated size of first Cloud Backup:

						{ siteSizeInMB !== 0
							? ` ${siteSizeInMB.toFixed(2)} MB`
							: <Spinner className={styles.CustomSpinnerStyles}/>
						}
					</Title>

					<p style={{ marginTop: 7 }}>For large sites, backing up your site for the first time can take up to hours to complete. Your site will be locked while the database is backed up.</p>
				</div>
				}

				<Title size="m" style={{ paddingBottom: 15, paddingTop: 15 }}>Add a description</Title>
				<BasicInput
					value={inputDescriptionData}
					onChange={onInputChange}
					maxlength={INPUT_MAX}
				/>

				<Title size="m" style={{ paddingTop: 15 }}>Ignore files</Title>
				<p style={{ marginTop: 7 }}>Add any files(s) here that you'd like to exclude from this backup:</p>
				<code>{ignoreFilePath}</code>
				<CopyButton style={{ marginTop: 10 }} textToCopy={ignoreFilePath} />
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
					Start Cloud Backup
				</PrimaryButton>
			</div>
		</div>);
};
