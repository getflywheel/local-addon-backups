import React, { useState } from 'react';
import { BasicInput, Title, Divider, PrimaryButton } from '@getflywheel/local-components';
import styles from './BackupEditDescriptionContents.scss';
import { ipcAsync } from '@getflywheel/local/renderer';
import type { Site } from '@getflywheel/local';
import { BackupSnapshot } from '../../../types';
import { IPCASYNC_EVENTS } from '../../../constants';
import { actions, store } from '../../store/store';

export interface ModalContentsProps {
	site: Site;
	snapshot: BackupSnapshot;
}

export const BackupEditDescriptionContents = (props: ModalContentsProps) => {
	const [description, updateDescription] = useState('');

	const updateDescriptionGQL = async () => {
		await ipcAsync(
			IPCASYNC_EVENTS.EDIT_BACKUP_DESCRIPTION,
			{
				metaData: { ...props.snapshot.configObject, description },
				snapshot: props.snapshot,
			},
		);
	};

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>
				Edit Cloud Backup description
			</Title>
			<Divider className={styles.Divider} />
			<BasicInput
				value={description}
				onChange={(e) => updateDescription(e.target.value)}
			/>
			<PrimaryButton
				onClick={updateDescriptionGQL}
			>
				Update Description
			</PrimaryButton>
		</div>
	)
};

