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
import styles from './BackupContents.scss';
import { BackupSnapshot } from '../../../types';
import { getFilteredSiteFiles, getIgnoreFilePath } from '../../../helpers/ignoreFilesPattern';

const remote = require('@electron/remote');

const { shell } = remote;

export interface ModalContentsProps {
	submitAction: (description) => void;
	site: Site;
	snapshots: BackupSnapshot[];
}

export const BackupContents = (props: ModalContentsProps) => {
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

	const onClickEditIgnore = async (site: Site) => {
		const ignoreFilePath = getIgnoreFilePath(site);
		shell.openPath(ignoreFilePath);
	};

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>Back up site</Title>

			<hr />
			<div className={styles.AlignLeft}>
				{ !snapshots?.length &&
				<div>
					<Title size="m" className="align-left">Estimated size of first Cloud Backup: {siteSizeInMB.toFixed(2)} MB</Title>
					<p style={{ marginTop: 7 }}>For large sites, backing up your site for the first time can take up to hours to complete. Your site will be locked while the database is backed up.</p>
				</div>
				}

				<Title size="m" style={{ paddingBottom: 15, paddingTop: 15 }}>Add a description</Title>
				<BasicInput value={inputDescriptionData} onChange={onInputChange} />

				<Title size="m" style={{ paddingTop: 15 }}>Ignore files</Title>
				<p style={{ marginTop: 7 }}>Add any files(s) you would like to exclude from this backup.</p>

				<TextButton
					style={{ marginTop: 5 }}
					className={styles.NoPaddingLeft}
					onClick={() => onClickEditIgnore(site)}
				>
					Edit files to ignore
				</TextButton>
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
