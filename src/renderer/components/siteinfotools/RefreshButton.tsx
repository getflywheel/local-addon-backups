import React from 'react';
import RefreshSvg from '../../assets/refresh.svg';
import styles from './RefreshButton.scss';
import { store, useStoreSelector } from '../../store/store';
import { updateActiveSiteAndDataSources } from '../../store/thunks';
import classnames from 'classnames';
/**
 * Refreshes all backups related data for the active site including refetching enabled providers and snapshots.
 */
export const RefreshButton = () => {
	const siteId = useStoreSelector((state) => state.activeSite.id);
	const loading = useStoreSelector((state) => state.providers.isLoadingEnabledProviders);

	return (
		<button
			onClick={() => {
				store.dispatch(updateActiveSiteAndDataSources({ siteId }));
			}}
			className={classnames(styles.RefreshButton,
				{
					[styles.Spinning]: loading,
				},
			)}
		>
			<RefreshSvg/>
		</button>
	);
};
