import React from 'react';
import styles from './ToolsHeader.scss';
import type { Site } from '@getflywheel/local';
import { ProviderDropdown } from './ProviderDropdown';
import { PrimaryButton } from '@getflywheel/local-components';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';
import { StartBackupButton } from './StartBackupButton';
import { RefreshButton } from './RefreshButton';
import { selectors } from '../../store/selectors';
import {
	useStoreSelector,
} from '../../store/store';

interface Props {
	site: Site;
}

export const ToolsHeader = (props: Props) => {
	const { site } = props;
	const { enabledProviders } = useStoreSelector((state) => state.providers);
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);

	return (
		<div className={styles.ToolsHeaders}>
			<ProviderDropdown
				enabledProviders={enabledProviders}
				activeSiteProvider={activeSiteProvider}
				multiMachineSelect={false}
				siteId={site.id}
			/>
			<div className={styles.ToolsHeaders_Right}>
				<RefreshButton />
				{enabledProviders?.length
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
		</div>
	);
};
