import React from 'react';
import styles from './SiteInfoToolsSection.scss';
import { SnapshotsTableList } from './SnapshotsTableList';

export const ToolsContent = () => {
	return (
		<div className={styles.ToolsContent}>
			<div className={styles.SiteInfoToolsSection_Content}>
				<SnapshotsTableList />
			</div>
		</div>
	);
}
