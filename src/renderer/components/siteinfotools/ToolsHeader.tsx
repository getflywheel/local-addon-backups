import React from 'react';
import styles from './ToolsHeader.scss';
import type { Site } from '@getflywheel/local';
import { ProviderDropdown } from './ProviderDropdown';
import { Tooltip, RefreshButton, Button } from '@getflywheel/local-components';
import { StartBackupButton } from './StartBackupButton';
import { selectors } from '../../store/selectors';
import {
	store,
	useStoreSelector,
} from '../../store/store';
import { updateActiveSiteAndDataSources } from '../../store/thunks';
import { URLS } from '../../../constants';

interface Props {
	offline: boolean,
	site: Site;
	migrationStatus?: 'notStarted' | 'completed';
}

export const ToolsHeader = (props: Props) => {
	const { offline, site, migrationStatus } = props;
	const { enabledProviders } = useStoreSelector((state) => state.providers);
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);
	const onRefresh = () => {
		store.dispatch(updateActiveSiteAndDataSources({ siteId: site.id }));
	};
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
				{!offline && (
					<RefreshButton
						onClick={onRefresh}
						privateOptions={{ padding: 's' }}
					/>
				)}
				{enabledProviders?.length
					? (
						<StartBackupButton
							site={site}
							offline={offline}
							migrationCompleted={migrationStatus === 'completed'}
						/>
					)
					: (
						<Tooltip
							content={<>Check internet connection</>}
							popperOffsetModifier={{ offset: [-55, 10] }}
							showDelay={300}
							position="top-end"
						>
							<Button
								tag='a'
								tagProps={{ href: URLS.LOCAL_HUB_BACKUPS }}
								disabled={offline}
								privateOptions={{
									padding: 'm',
								}}
							>
								Connect provider
							</Button>
						</Tooltip>
					)
				}
			</div>
		</div>
	);
};
