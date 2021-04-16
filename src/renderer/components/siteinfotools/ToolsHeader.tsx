import React from 'react';
import styles from './ToolsHeader.scss';
import type { Site } from '@getflywheel/local';
import { ProviderDropdown } from './ProviderDropdown';
import { PrimaryButton } from '@getflywheel/local-components';
import { actions, store, useStoreSelector } from '../../store/store';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';
import { selectors } from '../../store/selectors';
import { createModal } from '../createModal';
import { BackupContents } from '../modals/BackupContents';

interface Props {
	site: Site;
}

export const ToolsHeader = (props: Props) => {
	const { site } = props;
	const { enabledProviders } = useStoreSelector((state) => state.providers);
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);
	const { snapshots } = useStoreSelector((state) => state.activeSite);
	const backupRunning = store.getState().backupInProgress.backupRunning;

	const backupSite = (description: string) => {
		store.dispatch(actions.backupSite(description));
	};

	return (
		<div className={styles.ToolsHeaders}>
			<ProviderDropdown />
			{enabledProviders.length
				? (
					<PrimaryButton
						disabled={!activeSiteProvider || backupRunning}
						onClick={() => createModal(
							() => (
								<BackupContents
									submitAction={backupSite}
									site={site}
									snapshots={snapshots}
								/>
							),
						)}
						privateOptions={{
							padding: 'm',
						}}
					>
						Back Up Site
					</PrimaryButton>
				)
				: (
					<PrimaryButton
						onClick={() => launchBrowserToHubBackups()}
						privateOptions={{
							padding: 'm',
						}}
					>
						Connect Provider
					</PrimaryButton>
				)
			}
		</div>
	);
}
