import React from 'react';
import styles from './ToolsHeader.scss';
import { ProviderDropdown } from './ProviderDropdown';
import { PrimaryButton } from '@getflywheel/local-components';
import { actions, store, useStoreSelector } from '../../store/store';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';
import { selectors } from '../../store/selectors';

export const ToolsHeader = () => {
	const { enabledProviders } = useStoreSelector((state) => state.providers);
	const { backupRunning } = useStoreSelector((state) => state.backupInProgress);

	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);
	return (
		<div className={styles.ToolsHeaders}>
			<ProviderDropdown />
			{enabledProviders.length
				? (
					<PrimaryButton
						disabled={!activeSiteProvider || backupRunning}
						onClick={() => store.dispatch(actions.backupSite())}
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
