import React from 'react';
import type { Site } from '@getflywheel/local';
import { OfflineBanner } from '@getflywheel/local-components';
import useUpdateActiveSiteAndDataSources from '../useUpdateActiveSiteAndDataSources';
import { store, useStoreSelector } from '../../store/store';
import styles from './SiteInfoToolsSection.scss';
import { ToolsHeader } from './ToolsHeader';
import { ToolsContent } from './ToolsContent';
import { getEnabledProvidersHub } from '../../store/thunks';
import TryAgain from './TryAgain';
import { $offline } from '@getflywheel/local/renderer';
import { useObserver } from 'mobx-react';
interface Props {
	site: Site;
}

const SiteInfoToolsSection = ({ site }: Props) => {
	// update active site anytime the site prop changes
	useUpdateActiveSiteAndDataSources(site.id);

	const {
		hasErrorLoadingEnabledProviders,
	} = useStoreSelector((state) => state.providers);
	const { id } = useStoreSelector((state) => state.activeSite);

	/**
	 * @todo sometimes the query to hub fails (like if the auth token has expired)
	 * we should handle that more gracefully
	 */

	if (hasErrorLoadingEnabledProviders) {
		return (
			<div className={styles.SiteInfoToolsSection}>
				<TryAgain
					message={'There was an issue retrieving your Cloud Backups providers.'}
					onClick={() => store.dispatch(getEnabledProvidersHub({ siteId: id }))}
				/>
			</div>
		);
	}

	return useObserver(() => {
		const offline = $offline.offline;

		return (
			<div className={styles.SiteInfoToolsSection}>
				<OfflineBanner offline={offline} />
				<ToolsHeader site={site} offline={offline} />
				<ToolsContent
					className={styles.SiteInfoToolsSection_Content}
					offline={offline}
					site={site}
				/>
			</div>
		);
	});
};

export default SiteInfoToolsSection;
