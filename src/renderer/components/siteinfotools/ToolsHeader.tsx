import React from 'react';
import styles from './ToolsHeader.scss';
import type { Site } from '@getflywheel/local';
import { ProviderDropdown } from './ProviderDropdown';
import { PrimaryButton } from '@getflywheel/local-components';
import { useStoreSelector } from '../../store/store';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';
import { StartBackupButton } from './StartBackupButton';

interface Props {
	site: Site;
}

export const ToolsHeader = (props: Props) => {
	const { site } = props;
	const { enabledProviders } = useStoreSelector((state) => state.providers);
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);
	const { snapshots } = useStoreSelector((state) => state.activeSite);
	const { backupIsRunning } = useStoreSelector((state) => state.director);
	const backupSite = (description: string) => {
		store.dispatch(actions.backupSite({
			description,
			siteId: site.id,
			siteName: site.name,
		}));
	};

	return (
		<div className={styles.ToolsHeaders}>
			<ProviderDropdown />
			{enabledProviders.length
				? (
					<StartBackupButton site={site} />
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
};
