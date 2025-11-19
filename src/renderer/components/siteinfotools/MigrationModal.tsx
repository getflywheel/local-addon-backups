import React, { useState, useEffect } from 'react';
import { FlyModal, Title, PrimaryButton, TextButton, ProgressBar } from '@getflywheel/local-components';
import styles from '../modals/BackupContents.scss';
import { ipcAsync } from '@getflywheel/local/renderer';
import { IPCASYNC_EVENTS } from '../../../constants';
import type { MigrationProgress, MigrationResult } from '../../../types';
import * as LocalRenderer from '@getflywheel/local/renderer';
import { launchBrowser } from '../../helpers/launchBrowser';

const { ipcRenderer } = window.require('electron');

export const MigrationModal: React.FC = () => {
	const [isMigrating, setIsMigrating] = useState(false);
	const [progress, setProgress] = useState(0);
	const [statusMessage, setStatusMessage] = useState('Preparing migration...');
	const [isComplete, setIsComplete] = useState(false);
	const [hasError, setHasError] = useState<string | null>(null);
	const [result, setResult] = useState<MigrationResult | null>(null);

	// Determine if migration is allowed (Local 10+ or QA override)
	const qaOverride = String(process?.env?.BACKUP_MIGRATION_QA || '').toLowerCase() === 'true';
	const isLocal10Plus = (() => {
		const version = String((process as any)?.localVersion || '');
		const match = version.match(/^(\d+)/);
		const major = match ? parseInt(match[1], 10) : 0;
		return major >= 10;
	})();
	const canMigrate = qaOverride || isLocal10Plus;

	useEffect(() => {
		// Listen for progress updates
		const progressHandler = (event: any, progressData: MigrationProgress) => {
			setProgress(progressData.progress);
			setStatusMessage(progressData.message);
		};

		// Listen for completion
		const completeHandler = (event: any, migrationResult: MigrationResult) => {
			setIsComplete(true);
			setIsMigrating(false);
			setResult(migrationResult);
			setProgress(1);

			if (migrationResult.errors && migrationResult.errors.length > 0) {
				setStatusMessage(`Migration completed with ${migrationResult.errors.length} error(s)`);
			} else {
				setStatusMessage('Migration completed successfully!');
			}
		};

		// Listen for errors
		const errorHandler = (event: any, migrationResult: MigrationResult) => {
			setIsComplete(true);
			setIsMigrating(false);
			setResult(migrationResult);
			setHasError('Migration failed. Please check the details below and try again.');
			setStatusMessage('Migration failed');
		};

		ipcRenderer.on('migration:progress', progressHandler);
		ipcRenderer.on('migration:complete', completeHandler);
		ipcRenderer.on('migration:error', errorHandler);

		// Cleanup listeners on unmount
		return () => {
			ipcRenderer.removeListener('migration:progress', progressHandler);
			ipcRenderer.removeListener('migration:complete', completeHandler);
			ipcRenderer.removeListener('migration:error', errorHandler);
		};
	}, []);

	const startMigration = async () => {
		setIsMigrating(true);
		setProgress(0);
		setStatusMessage('Starting migration...');
		setHasError(null);
		setResult(null);

		try {
			// Kick off migration in main
			const response = await ipcAsync(IPCASYNC_EVENTS.MIGRATE_BACKUPS_START);

			// Check if the response contains an error
			if (response && response.error) {
				const errorMessage = response.error.message || 'Failed to start migration';
				setHasError(`Failed to start migration: ${errorMessage}`);
				setIsMigrating(false);
				setIsComplete(true);
			}
		} catch (e) {
			setHasError('Failed to start migration. Please try again.');
			setIsMigrating(false);
			setIsComplete(true);
		}
	};

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>
				Migrate Cloud Backups
			</Title>
			<p style={{ marginTop: 7 }}>Move your existing Cloud Backups to the new Backups tab in Local&nbsp;10.</p>
			<p>
				This will take a few minutes to complete. Local will copy backup data to your cloud storage and update
				backup keys.
			</p>

			{!canMigrate && (
				<>
					<hr />
					<div className={styles.AlignLeft}>
						<p style={{ marginBottom: 8 }}>
							This migration requires Local&nbsp;10 or higher. Please install the latest Local release to
							continue.
						</p>
					</div>
					<div className={styles.ModalButtons} style={{ justifyContent: 'center' }}>
						<PrimaryButton
							style={{ marginTop: 0 }}
							onClick={() => launchBrowser('https://localwp.com/releases/')}
						>
							Download Local 10+
						</PrimaryButton>
					</div>
				</>
			)}

			{canMigrate && (
				<>
					<hr />

					{isMigrating && (
						<>
							<div className={styles.AlignLeft}>
								<Title size="s" style={{ marginBottom: 8 }}>
									Progress
								</Title>
								<ProgressBar progress={progress * 100} />
								<p style={{ marginTop: 8 }}>
									{Math.round(progress * 100)}% - {statusMessage}
								</p>
							</div>

							<hr />
						</>
					)}

					{isComplete && result && (
						<>
							<div className={styles.AlignLeft}>
								{result.success ? (
									<div>
										<p style={{ color: '#00a32a', marginBottom: 8 }}>
											<strong>✓ Migration completed successfully!</strong>
										</p>
										<p style={{ margin: '0 0 12px 0' }}>
											Visit the{' '}
											<a
												href="#"
												onClick={(e) => {
													e.preventDefault();
													LocalRenderer.sendIPCEvent('goToRoute', '/main/connect');
												}}
											>
												Connect sidebar
											</a>{' '}
											to log in and see all migrated backups from your connected providers.
											<strong>You can now remove the Cloud Backups add-on.</strong>
										</p>
										<ul style={{ marginLeft: 20, marginTop: 8 }}>
											<li>
												Migrated {result.migratedRepos}{' '}
												{result.migratedRepos === 1 ? 'site' : 'sites'}
											</li>
											<li>
												Migrated {result.migratedSnapshots}{' '}
												{result.migratedSnapshots === 1 ? 'backup' : 'backups'}
											</li>
											{result.skippedRepos > 0 && (
												<li>
													Skipped {result.skippedRepos}{' '}
													{result.skippedRepos === 1 ? 'site' : 'sites'}
												</li>
											)}
										</ul>
									</div>
								) : (
									<div>
										<p style={{ color: '#d0021b', marginBottom: 8 }}>✗ Migration failed</p>
									</div>
								)}
							</div>

							<hr />
						</>
					)}

					{hasError && !result && <p style={{ color: '#d0021b', marginBottom: 16 }}>{hasError}</p>}

					<div className={styles.ModalButtons} style={{ justifyContent: 'center' }}>
						{!isMigrating && !isComplete && (
							<PrimaryButton style={{ marginTop: 0 }} onClick={startMigration}>
								Start Migration
							</PrimaryButton>
						)}

						{isMigrating && !isComplete && (
							<PrimaryButton style={{ marginTop: 0 }} disabled={true}>
								Migrating...
							</PrimaryButton>
						)}

						{isComplete && result?.success && (
							<PrimaryButton
								style={{ marginTop: 0 }}
								onClick={() => LocalRenderer.sendIPCEvent('goToRoute', '/main/connect')}
							>
								See All Backups
							</PrimaryButton>
						)}

						{isComplete && hasError && (
							<PrimaryButton style={{ marginTop: 0 }} onClick={startMigration}>
								Retry Migration
							</PrimaryButton>
						)}
					</div>
				</>
			)}
		</div>
	);
};

export default MigrationModal;
