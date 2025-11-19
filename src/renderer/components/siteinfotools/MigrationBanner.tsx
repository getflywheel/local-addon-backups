import React from 'react';
import styles from './MigrationBanner.scss';
import { Button } from '@getflywheel/local-components';
import { createModal } from '../createModal';
import { MigrationModal } from './MigrationModal';
import * as LocalRenderer from '@getflywheel/local/renderer';

interface Props {
	migrationStatus: 'notStarted' | 'completed';
	siteId: string | number;
}

export const MigrationBanner = ({ migrationStatus, siteId }: Props) => {
	const isCompleted = migrationStatus === 'completed';

	return (
		<div className={styles.MigrationBanner_container}>
			<p>
				{!isCompleted ? (
					<>
						<strong>Backups are now built into Local 10!</strong> Move your backups from the old Cloud
						Backups Add-on to maintain access.
					</>
				) : (
					<>
						<strong>Migration completed.</strong> Visit the{' '}
						<a href={`#/main/site-info/${siteId}/backups`}>Backups&nbsp;tab</a> and log in to see your site
						backups. Find all site backups in the{' '}
						<a
							href="#"
							onClick={(e) => {
								e.preventDefault();
								LocalRenderer.sendIPCEvent('goToRoute', '/main/connect');
							}}
						>
							Connect sidebar
						</a>
						. You can now remove the{' '}
						<a
							href="#"
							onClick={(e) => {
								e.preventDefault();
								LocalRenderer.sendIPCEvent('goToRoute', '/main/marketplace/listings/installed');
							}}
						>
							Cloud Backups add-on
						</a>
						.
					</>
				)}
			</p>
			{!isCompleted ? (
				<Button onClick={() => createModal(() => <MigrationModal />)} privateOptions={{ padding: 'm' }}>
					Migrate your backups
				</Button>
			) : (
				<Button
					privateOptions={{ padding: 'm' }}
					onClick={() => LocalRenderer.sendIPCEvent('goToRoute', '/main/connect')}
				>
					See All Backups
				</Button>
			)}
		</div>
	);
};

export default MigrationBanner;
