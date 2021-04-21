import React from 'react';
import classnames from 'classnames';
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
import DateUtils from '../../helpers/DateUtils';
export interface ModalContentsProps {
	site: Site;
	snapshot: BackupSnapshot;
}

export const BackupRestoreContents = (props: ModalContentsProps) => {
	const { site, snapshot } = props;

	const { description } = snapshot.configObject;

	const onModalSubmit = (snapshotID: string) => {
		store.dispatch(actions.restoreSite(snapshotID));
		FlyModal.onRequestClose();
	};

	const snapshotDateToString = snapshot.updatedAt.toString();

	const [monDayYear, time] = DateUtils.formatDate(snapshotDateToString);

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>Restore Cloud Backup to "{site.name}"</Title>
			<p style={{ marginTop: 7 }}>We’ll roll back your site to the selected Cloud Backup. Please note your site will be locked until the backup has finished being restored.</p>

			<hr />
			<div className={classnames(
				styles.AlignLeft,
				styles.RestoreModalContents,
			)}>

				<Title size="m" className="align-left" container={{ margin: 'm 0' }}>
					Cloud Backup details
				</Title>

				<Title size="s">Created at:</Title>
				<p>{monDayYear} {time} UTC</p>

				{description &&
					<>
						<Title size="s" style={{ paddingTop: 20 }}>Description:</Title>
						<p>{description}</p>
					</>
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
					onClick={() => onModalSubmit(snapshot.hash)}
				>
					Restore Cloud Backup
				</PrimaryButton>
			</div>
		</div>);
};
