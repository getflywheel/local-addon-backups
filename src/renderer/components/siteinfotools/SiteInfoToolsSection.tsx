import React, { useEffect, useState } from 'react';
import { EmptyArea, Text, Divider, Button } from '@getflywheel/local-components';
import { ipcAsync } from '@getflywheel/local/renderer';
import type { Site } from '@getflywheel/local';
import useActiveSiteID from '../useActiveSiteID';
import { BackupSnapshot, HubOAuthProviders, HubProviderRecord, Providers } from '../../../types';
import { useStoreSelector, selectors, store, actions } from '../../store/store';
import styles from './SiteInfoToolsSection.scss';
import { ToolsHeader } from '../siteinfotools/ToolsHeader';

interface Props {
	site: Site;
}

/**
 * Hub/Rsync use slightly different naming conventions for each provider. This maps from the Hub
 * provided values to those expected by Rsync
 *
 * @param hubProvider
 */
const hubProviderToProvider = (hubProvider: HubOAuthProviders) => {
	if (hubProvider === HubOAuthProviders.Google) {
		return Providers.Drive;
	}

	if (hubProvider === HubOAuthProviders.Dropbox) {
		return Providers.Dropbox;
	}

	return null;
};

/**
 * Light convenience wrapper around ipcAsync to backup a site
 *
 * @param site
 * @param provider
 */
const backupSite = (site: Site, provider: Providers) => ipcAsync(
	'backups:backup-site',
	site.id,
	provider,
);

const SnapshotList = (props: { snapshots: BackupSnapshot[], site: Site, provider: Providers }) => (
	<ul>
		{props.snapshots.map(({ updatedAt, hash }) => (
			<li>
				{updatedAt}
				<Button
					onClick={() => ipcAsync(
						'backups:restore-backup', {
							snapshotID: hash,
							provider: props.provider,
							siteID: props.site.id,
						},
					)}
				>
					Revert to this backup
				</Button>
			</li>
		))}
	</ul>
);

const SiteInfoToolsSection = ({ site }: Props) => {
	useActiveSiteID(site.id);
	const { isLoadingEnabledProviders } = useStoreSelector((state) => state.providers);

	// const { enabledProviders } = useStoreSelector((state) => state.providers);
	// const [loadingProviders, setLoadingProviders] = useState(false);
	// const [snapshots, setSnapshots] = useState({});

	// useEffect(() => {
	//     (async () => {
	// 		setLoadingProviders(true);
	// 		const providers: HubProviderRecord[] = await ipcAsync('backups:enabled-providers');
	// 		store.dispatch(actions.setEnabledProviders(providers));
	// 		setLoadingProviders(false);

	// 		const promises = [];
	// 		const hubProviderNames: HubOAuthProviders[] = [];
	// 		providers
	// 			.map(({ id }) => id)
	// 			.forEach((providerID) => {
	// 				promises.push(ipcAsync('backups:provider-snapshots', site.id, providerID));
	// 				hubProviderNames.push(providerID);
	// 			});

	// 		const resolvedSnapshots: BackupSnapshot[][] = await Promise.all(promises);

	// 		setSnapshots(
	// 			resolvedSnapshots.reduce((nextSnapshotState, snapshotList, i) => {
	// 				const provider = hubProviderNames[i];
	// 				nextSnapshotState[provider] = snapshotList;
	// 				return nextSnapshotState;
	// 			}, {}),
	// 		);
	//     })();
	// }, []);

	/**
	 * @todo sometimes the query to hub fails (like if the auth token has expired)
	 * we should handle that more gracefully
	 */
	if (isLoadingEnabledProviders) {
		return (
			<span>loading...</span>
		);
	}

	return (
		<div className={styles.SiteInfoToolsSection}>
			<ToolsHeader />
			<div className={styles.SiteInfoToolsSection_Content}>
				{/* {addDivider(enabledProviders.map(({ id, name }) => {
					const Icon = getProviderIcon(id);
					const provider = hubProviderToProvider(id);

					return (
						<>
							<div className={styles.SiteInfoToolsSection_ProviderHeader}>
								<Icon />
								<Text privateOptions={{ fontSize: 'm', fontWeight: 'bold' }}>{name}</Text>
								<Button
									onClick={() => backupSite(site, provider)}
								>
									Backup Site
								</Button>
							</div>
							{
								snapshots[id]?.length
									? (
										<SnapshotList
											snapshots={snapshots[id]}
											site={site}
											provider={provider}
										/>
									)
									: (
										<EmptyArea className={styles.SiteInfoToolsSection_EmptyArea}>
											<Text>No backups created yet</Text>
										</EmptyArea>
									)
							}
						</>
					);
				}))} */}
				</div>
		</div>
	);
};

export default SiteInfoToolsSection;
