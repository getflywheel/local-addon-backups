import React, { useState, useCallback } from 'react';
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
import { INPUT_MAX } from '../../../constants';
export interface ModalContentsProps {
	site: Site;
	snapshot: BackupSnapshot;
}

export const BackupEditDescriptionContents = (props: ModalContentsProps) => {
	const [description, updateDescription] = useState('');
	const { site, snapshot } = props;
	const { configObject } = snapshot;

	const updateDescriptionGQL = useCallback(() => {
		store.dispatch(actions.editSnapshotMetaData({
			siteId: site.id,
			metaData: { ...configObject, description },
			snapshot: snapshot,
		}));

		FlyModal.onRequestClose();
	}, [description]);

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>
				Edit backup description
			</Title>
			<Divider className={styles.Divider} />
			<BasicInput
				autofocus
				value={description}
				placeholder={configObject.description}
				onChange={(e) => updateDescription(e.target.value)}
				maxlength={INPUT_MAX}
			/>
			<PrimaryButton
				inline
				onClick={updateDescriptionGQL}
			>
				Update description
			</PrimaryButton>
		</div>
	);
};
