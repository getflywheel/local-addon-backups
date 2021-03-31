import React from 'react';
import { ipcAsync } from '@getflywheel/local/renderer';
import type { Site } from '@getflywheel/local';
import updateActiveSiteAndDataSources from '../updateActiveSiteAndDataSources';
import { HubOAuthProviders, Providers } from '../../../types';
import { useStoreSelector } from '../../store/store';
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

// const SnapshotList = (props: { snapshots: BackupSnapshot[], site: Site, provider: Providers }) => (
// 	<ul>
// 		{props.snapshots.map(({ updatedAt, hash }) => (
// 			<li>
// 				{updatedAt}
// 				<Button
// 					onClick={() => ipcAsync(
// 						'backups:restore-backup', {
// 							snapshotID: hash,
// 							provider: props.provider,
// 							siteID: props.site.id,
// 						},
// 					)}
// 				>
// 					Revert to this backup
// 				</Button>
// 			</li>
// 		))}
// 	</ul>
// );

const SiteInfoToolsSection = ({ site }: Props) => {
	updateActiveSiteAndDataSources(site.id);

	const { isLoadingEnabledProviders } = useStoreSelector((state) => state.providers);
	const { snapshots } = useStoreSelector((state) => state.activeSite);

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
				{!snapshots?.length && (
					<div className={styles.SiteInfoToolsSection_Content_Empty}>
						There are no backups created for this site yet.
					</div>
				)}
			</div>
		</div>
	);
};

export default SiteInfoToolsSection;
