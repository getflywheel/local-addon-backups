import React from 'react';
import {
	FlyModal,
	Title,
	PrimaryButton,
	TextButton,
} from '@getflywheel/local-components';
import type { Site } from '@getflywheel/local';
import styles from './BackupContents.scss';
import { BackupSnapshot } from '../../../types';
import { actions, store } from '../../store/store';
export interface ModalContentsProps {
	site: Site;
	snapshot: BackupSnapshot;
}

export const BackupRestoreContents = (props: ModalContentsProps) => {
	const { site, snapshot } = props;

	const onModalSubmit = (snapshotID: string) => {
		store.dispatch(actions.restoreSite(snapshotID));
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
				<p style={{ marginTop: 7 }}>{snapshot.updatedAt}</p>

				<Title size="s" style={{ paddingTop: 15 }}>Description:</Title>
				<p style={{ marginTop: 7 }}>{snapshot.status}</p>


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
					onClick={() => onModalSubmit(snapshot.hash)}
				>
					Restore Backup
				</PrimaryButton>
			</div>
		</div>);
};
