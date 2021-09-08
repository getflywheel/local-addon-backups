import React from 'react';
import styles from './ToolsContent.scss';
import classnames from 'classnames';
import { SnapshotsTableList } from './SnapshotsTableList';
import type { Site } from '@getflywheel/local';
import { store, useStoreSelector } from '../../store/store';
import { getSnapshotsForActiveSiteProviderHub } from '../../store/thunks';
import TryAgain from './TryAgain';
import { selectors } from '../../store/selectors';
import { selectActivePagingDetails } from '../../store/snapshotsSlice';

interface Props {
	offline: boolean,
	className: string;
	site: Site;
}

export const ToolsContent = ({ className, site, offline }: Props) => {
	const activeSite = useStoreSelector((state) => state.activeSite);
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);
	const activePagingDetails = useStoreSelector(selectActivePagingDetails);

	if (activePagingDetails?.hasLoadingError) {
		return (
			<TryAgain
				message={`There was an issue retrieving the list of your site's Cloud Backups for ${activeSiteProvider?.name}.`}
				onClick={() => store.dispatch(getSnapshotsForActiveSiteProviderHub({
					siteId: activeSite.id,
				}))}
			/>
		);
	}

	return (
		<div
			className={classnames(
				className,
				styles.ToolsContent,
			)}
		>
			<SnapshotsTableList site={site} offline={offline}/>
		</div>
	);
};
