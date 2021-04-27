import React from 'react';
import styles from './ToolsHeader.scss';
import type { Site } from '@getflywheel/local';
import { ProviderDropdown } from './ProviderDropdown';
import { PrimaryButton } from '@getflywheel/local-components';
import { useQuery, useSubscription } from '@apollo/client';
import { actions, store, useStoreSelector } from '../../store/store';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';
import { selectors } from '../../store/selectors';
import { createModal } from '../createModal';
import { BackupContents } from '../modals/BackupContents';
import { GET_SITE } from '../../localClient/queries';
import { SITE_STATUS_CHANGED } from '../../localClient/subscriptions';

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

	const { data: siteQueryData } = useQuery(GET_SITE, {
		variables: { siteID: site.id },
	});

	const { data: siteStatusSubscriptionData } = useSubscription(SITE_STATUS_CHANGED);

	const subscriptionResult = siteStatusSubscriptionData?.siteStatusChanged;

	const siteStatus = subscriptionResult?.id === site.id
		? subscriptionResult?.status
		: siteQueryData?.site.status;

	return (
		<div className={styles.ToolsHeaders}>
			<ProviderDropdown />
			{enabledProviders.length
				? (
					<PrimaryButton
						disabled={!activeSiteProvider || backupRunning || siteStatus !== 'running'}
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
};
