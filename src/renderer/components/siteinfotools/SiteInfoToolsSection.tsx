import React from 'react';
import type { Site } from '@getflywheel/local';
import { LoadingIndicator } from '@getflywheel/local-components';
import useUpdateActiveSiteAndDataSources from '../useUpdateActiveSiteAndDataSources';
import { store, useStoreSelector } from '../../store/store';
import styles from './SiteInfoToolsSection.scss';
import { ToolsHeader } from './ToolsHeader';
import { ToolsContent } from './ToolsContent';
import { getEnabledProvidersHub } from '../../store/thunks';
import TryAgain from './TryAgain';

interface Props {
	site: Site;
}

const SiteInfoToolsSection = ({ site }: Props) => {
	// update active site anytime the site prop changes
	useUpdateActiveSiteAndDataSources(site.id);

	const {
		hasErrorLoadingEnabledProviders,
		isLoadingEnabledProviders,
	} = useStoreSelector((state) => state.providers);
	const { id } = useStoreSelector((state) => state.activeSite);

	/**
	 * @todo sometimes the query to hub fails (like if the auth token has expired)
	 * we should handle that more gracefully
	 */
	if (isLoadingEnabledProviders) {
		return (
			<div className={styles.SiteInfoToolsSection}>
				<div className={styles.SiteInfoToolsSection_LoadingCont}>
					<LoadingIndicator color="Gray" dots={3} />
				</div>
			</div>
		);
	} else if (hasErrorLoadingEnabledProviders) {
		return (
			<div className={styles.SiteInfoToolsSection}>
				<TryAgain
					message={'There was an issue retrieving your Cloud Backups providers.'}
					onClick={() => store.dispatch(getEnabledProvidersHub({ siteId: id }))}
				/>
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
