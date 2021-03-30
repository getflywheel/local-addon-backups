import React from 'react';
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

/* @ts-ignore */
import styles from './BackupInfoModal.scss';
import { BackupSnapshot, Providers } from '../../types';
import { getSiteSizeEstimate } from '../utils';

interface ModalContentsProps {
	submitAction: (site, provider) => void;
	site: Site;
	provider: Providers;
	snapshots: BackupSnapshot[];
}

const ModalContents = (props: ModalContentsProps) => {
	const { submitAction, site, provider, snapshots } = props;

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>Back up site</Title>

			<hr />
			<div className={styles.AlignLeft}>
				{ !snapshots?.length &&
				<div>
					<Title size="m" className="align-left">Estimated size of first backup: </Title>
					<p style={{ marginTop: 7 }}>For large sites, backing up your site for the first time can take up to hours to complete. Your site will be locked while the database is backed up.</p>
				</div>
				}

				<Title size="m" style={{ paddingBottom: 15, paddingTop: 15 }}>Add a description</Title>
				<BasicInput>

				</BasicInput>

				<Title size="m" style={{ paddingTop: 15 }}>Ignore files</Title>
				<p style={{ marginTop: 7 }}>Add any files(s) you would like to exclude from this backup.</p>

				<TextButton
					style={{ marginTop: 5 }}
					className={styles.NoPaddingLeft}
					onClick={FlyModal.onRequestClose}
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
					onClick={() => submitAction(site, provider)}
				>
					Start Backup
				</PrimaryButton>
			</div>
		</div>);
};

export const createBackupModal = (
	submitAction: (site, provider) => void,
	site: Site,
	provider: Providers,
	snapshots: BackupSnapshot[],
) => new Promise((resolve) => {
	const onSubmit = (checked) => {
		FlyModal.onRequestClose();

		resolve(checked);
	};

	ReactDOM.render(
		<FlyModal
			contentLabel='Back up site'
			className={classnames('FlyModal')}
		>
			<ModalContents
				submitAction={submitAction}
				site={site}
				provider={provider}
				snapshots={snapshots}
			/>
		</FlyModal>,
		document.getElementById('popup-container'),
	);
});

// export default createBackupModal();
