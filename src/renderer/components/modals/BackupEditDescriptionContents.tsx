import React from 'react';
import { BasicInput, Title, Divider, PrimaryButton } from '@getflywheel/local-components';
import styles from './BackupEditDescriptionContents.scss';

export const BackupEditDescriptionContents = () => {
	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>
				Edit Cloud Backup description
			</Title>
			<Divider className={styles.Divider} />
			<BasicInput />
			<PrimaryButton>
				Update Description
			</PrimaryButton>
		</div>
	)
};

