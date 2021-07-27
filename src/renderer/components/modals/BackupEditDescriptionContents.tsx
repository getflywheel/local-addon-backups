import React, { useState } from 'react';
import {
	FlyModal,
	BasicInput,
	Title,
	Divider,
	PrimaryButton,
} from '@getflywheel/local-components';
import styles from './BackupEditDescriptionContents.scss';
import type { Site } from '@getflywheel/local';
import { BackupSnapshot } from '../../../types';
import { actions, store } from '../../store/store';
export interface ModalContentsProps {
	site: Site;
	snapshot: BackupSnapshot;
}

export const BackupEditDescriptionContents = (props: ModalContentsProps) => {
	const [description, updateDescription] = useState('');
	const { site, snapshot } = props;
	const { configObject } = snapshot;

	const updateDescriptionGQL = () => {
		store.dispatch(actions.editSnapshotMetaData({
			siteId: site.id,
			metaData: { ...configObject, description },
			snapshot: snapshot,
		}));

		FlyModal.onRequestClose();
	};

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>
				Edit Cloud Backup description
			</Title>
			<Divider className={styles.Divider} />
			<BasicInput
				autoFocus
				value={description}
				placeholder={configObject.description}
				onChange={(e) => updateDescription(e.target.value)}
				maxLength={50}
			/>
			<PrimaryButton
				onClick={updateDescriptionGQL}
			>
				Update Description
			</PrimaryButton>
		</div>
	);
};
