import React from 'react';
import type { Site } from '@getflywheel/local';
import { LoadingIndicator } from '@getflywheel/local-components';
import useUpdateActiveSiteAndDataSources from '../useUpdateActiveSiteAndDataSources';
import { useStoreSelector } from '../../store/store';
import styles from './SiteInfoToolsSection.scss';
import { ToolsHeader } from '../siteinfotools/ToolsHeader';
import { ToolsContent } from '../siteinfotools/ToolsContent';
import { ipcAsync } from '@getflywheel/local/renderer';
import { Providers } from '../../../types';
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
			<div className={styles.SiteInfoToolsSection_LoadingCont}>
				<LoadingIndicator color="Gray" dots={3} />
			</div>
		);
	}

	return (
		<div className={styles.SiteInfoToolsSection}>
			<ToolsHeader site={site} />
			<ToolsContent
				className={styles.SiteInfoToolsSection_Content}
				site={site}
			/>
		</div>
	);
};

export default SiteInfoToolsSection;
