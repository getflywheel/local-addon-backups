import React from 'react';
import type { Site } from '@getflywheel/local';
import updateActiveSiteAndDataSources from '../updateActiveSiteAndDataSources';
import { useStoreSelector } from '../../store/store';
import styles from './SiteInfoToolsSection.scss';
import { ToolsHeader } from '../siteinfotools/ToolsHeader';

interface Props {
	site: Site;
}

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
