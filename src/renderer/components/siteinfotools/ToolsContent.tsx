import React from 'react';
import styles from './ToolsContent.scss';
import classnames from 'classnames';
import { SnapshotsTableList } from './SnapshotsTableList';
import type { Site } from '@getflywheel/local';
import { store, useStoreSelector } from '../../store/store';
import { getSnapshotsForActiveSiteProviderHub } from '../../store/thunks';
import TryAgain from './TryAgain';
import { selectors } from '../../store/selectors';

interface Props {
	className: string;
	site: Site;
}

export const ToolsContent = ({ className, site }: Props) => {
	const { hasErrorLoadingSnapshots } = useStoreSelector((state) => state.activeSite);
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);

	if (hasErrorLoadingSnapshots) {
		return (
			<TryAgain
				message={`There was an issue retrieving the list of your site's Cloud Backups for ${activeSiteProvider?.name}.`}
				onClick={() => store.dispatch(getSnapshotsForActiveSiteProviderHub())}
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
			<SnapshotsTableList site={site}/>
		</div>
	);
};
