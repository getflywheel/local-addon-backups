import React from 'react';
import styles from './MigrationBanner.scss';
import { Button } from '@getflywheel/local-components';
import { createModal } from '../createModal';
import { MigrationModal } from './MigrationModal';

export const MigrationBanner = () => {
	return (
		<div className={styles.MigrationBanner_container}>
			<p>
				<strong>Backups are now built into Local 10!</strong> Move your backups from the old Cloud Backups Add-on to maintain access.
			</p>
			<Button
				onClick={() => createModal(() => (<MigrationModal />))}
				privateOptions={{ padding: 'm' }}
			>
				Migrate your backups
			</Button>
		</div>
	);
};

export default MigrationBanner;
