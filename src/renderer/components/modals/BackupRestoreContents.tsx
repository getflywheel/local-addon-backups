import React, { useEffect, useState } from 'react';
import {
	FlyModal,
	Title,
	PrimaryButton,
	TextButton,
	BasicInput,
} from '@getflywheel/local-components';
import type { Site } from '@getflywheel/local';
import getSize from 'get-folder-size';
import styles from './BackupInfoModal.scss';
import { BackupSnapshot } from '../../../types';
import { getFilteredSiteFiles, getIgnoreFilePath } from '../../../helpers/ignoreFilesPattern';

const remote = require('@electron/remote');

const { shell } = remote;

export interface ModalContentsProps {
	submitAction?: (description) => void;
	site?: Site;
	snapshots?: BackupSnapshot[];
	snapshot?: BackupSnapshot;
}

export const BackupRestoreContents = (props: ModalContentsProps) => {
	const { submitAction, site, snapshots } = props;

	const [siteSizeInMB, setSiteSizeInMB] = useState(0);
	const [inputDescriptionData, setInputData] = useState('');

	useEffect(() => {
		const fetchSiteSizeInMB = async () => {
			const filesToEstimate = getFilteredSiteFiles(site);
			let siteSize = 0;

			filesToEstimate.forEach(async (dir) => {
				await getSize(dir, (err, size: number) => {
					siteSize += (size / 1024 / 1024);
					setSiteSizeInMB(siteSize);
				});
			});
		};
		fetchSiteSizeInMB();
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
			<Title size="l" container={{ margin: 'm 0' }}>Restore backup to "{site.name}"</Title>
			<p style={{ marginTop: 7 }}>We’ll roll back your site to the selected backup. Please note your site will be locked until the backup has finished being restored.</p>

			<hr />
			<div className={styles.AlignLeft}>

				<Title size="m" className="align-left">Backup details</Title>

				<Title size="s" style={{ paddingBottom: 15, paddingTop: 15 }}>Created at:</Title>


				<Title size="s" style={{ paddingTop: 15 }}>Description:</Title>


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
					Restore Backup
				</PrimaryButton>
			</div>
		</div>);
};
