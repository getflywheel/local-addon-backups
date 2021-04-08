import React from 'react';
import type { Site } from '@getflywheel/local';
import useUpdateActiveSiteAndDataSources from '../useUpdateActiveSiteAndDataSources';
import { useStoreSelector } from '../../store/store';
import styles from './SiteInfoToolsSection.scss';
import { ToolsHeader } from '../siteinfotools/ToolsHeader';
import { ToolsContent } from '../siteinfotools/ToolsContent';

interface Props {
	site: Site;
}

const SiteInfoToolsSection = ({ site }: Props) => {
	useUpdateActiveSiteAndDataSources(site.id);

	const { isLoadingEnabledProviders } = useStoreSelector((state) => state.providers);

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
			<ToolsHeader site={site} />
			<ToolsContent />
		</div>
	);
};

export default SiteInfoToolsSection;
