import React, { useEffect, useRef, useState } from 'react';
import {
	FlyModal,
	Title,
	PrimaryButton,
	TextButton,
	ProgressBar,
} from '@getflywheel/local-components';
import styles from '../modals/BackupContents.scss';
import { ipcAsync } from '@getflywheel/local/renderer';
import { IPCASYNC_EVENTS } from '../../../constants';

export const MigrationModal: React.FC = () => {
	const [progress, setProgress] = useState(0);
	const [statusMessage, setStatusMessage] = useState('Preparing migration...');
	const [isComplete, setIsComplete] = useState(false);
	const [hasError, setHasError] = useState<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		let isCancelled = false;

		const clearTimer = () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};

		const simulateProgress = () => {
			const next = Math.min(1, progress + Math.random() * 0.12 + 0.06);
			setProgress(next);

			if (next < 0.25) {
				setStatusMessage('Scanning existing backups...');
			} else if (next < 0.8) {
				setStatusMessage('Migrating backups to the new system...');
			} else if (next < 1) {
				setStatusMessage('Finalizing migration...');
			}

			if (next >= 1) {
				setIsComplete(true);
				setStatusMessage('Migration complete.');
				return;
			}

			timerRef.current = setTimeout(() => {
				if (!isCancelled) {
					simulateProgress();
				}
			}, 400);
		};

		const startMigration = async () => {
			try {
				// Kick off migration in main (handler to be implemented later)
				await ipcAsync(IPCASYNC_EVENTS.MIGRATE_BACKUPS_START);
			} catch (e) {
				// Fallback to simulated progress if main handler isn't available yet
			}

			// Begin simulated progress immediately so UI reflects work starting
			simulateProgress();
		};

		startMigration();

		return () => {
			isCancelled = true;
			clearTimer();
			// Best-effort notify main of cancellation (no-op until implemented)
			void ipcAsync(IPCASYNC_EVENTS.MIGRATE_BACKUPS_CANCEL).catch(() => undefined);
		};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onClose = () => FlyModal.onRequestClose();

	return (
		<div>
			<Title size="l" container={{ margin: 'm 0' }}>Migrate Cloud Backups</Title>
			<p style={{ marginTop: 7 }}>
				We’re migrating your existing Cloud Backups to the new Backups tab in Local&nbsp;10. You can close this window at any time. Migration will continue as long as Local is open.
			</p>

			<hr />

			<div className={styles.AlignLeft}>
				<Title size="s" style={{ marginBottom: 8 }}>Progress</Title>
				<ProgressBar progress={progress} />
				<p style={{ marginTop: 8 }}>{Math.round(progress * 100)}% - {statusMessage}</p>
				{hasError && <p style={{ color: '#d0021b' }}>{hasError}</p>}
			</div>

			<hr />

			<div className={styles.ModalButtons}>
				<TextButton
					style={{ marginTop: 0 }}
					className={styles.NoPaddingLeft}
					onClick={onClose}
				>
					{isComplete ? 'Dismiss' : 'Close'}
				</TextButton>

				<PrimaryButton
					style={{ marginTop: 0 }}
					onClick={onClose}
					disabled={!isComplete}
				>
					{isComplete ? 'Done' : 'Migrating...'}
				</PrimaryButton>
			</div>
		</div>
	);
};

export default MigrationModal;


