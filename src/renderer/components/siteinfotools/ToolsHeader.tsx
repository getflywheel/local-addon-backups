import React from 'react';
import styles from './ToolsHeader.scss';
import type { Site } from '@getflywheel/local';
import { ProviderDropdown } from './ProviderDropdown';
import { PrimaryButton, Tooltip } from '@getflywheel/local-components';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';
import { StartBackupButton } from './StartBackupButton';
import { RefreshButton } from './RefreshButton';
import { selectors } from '../../store/selectors';
import {
	useStoreSelector,
} from '../../store/store';

interface Props {
	offline: boolean,
	site: Site;
}

export const ToolsHeader = (props: Props) => {
	const { offline, site } = props;
	const { enabledProviders } = useStoreSelector((state) => state.providers);
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);

	return (
		<div className={styles.ToolsHeaders}>
			<ProviderDropdown
				enabledProviders={enabledProviders}
				activeSiteProvider={activeSiteProvider}
				multiMachineSelect={false}
				siteId={site.id}
				offline={offline}
			/>
			<div className={styles.ToolsHeaders_Right}>
				{!offline && <RefreshButton />}
				{enabledProviders?.length
					? (
						<StartBackupButton site={site} offline={offline}/>
					)
					: (
						<Tooltip
							content={<>Check internet connection</>}
							popperOffsetModifier={{ offset: [-55, 10] }}
							showDelay={300}
							position="top-end"
						>
							<PrimaryButton
								disabled={offline}
								onClick={() => launchBrowserToHubBackups()}
								privateOptions={{
									padding: 'm',
								}}
							>
								Connect Provider
							</PrimaryButton>
						</Tooltip>
					)
				}
			</div>
		</div>
	);
};
