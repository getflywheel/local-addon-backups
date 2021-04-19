import React from 'react';
import styles from './ToolsContent.scss';
import classnames from 'classnames';
import { SnapshotsTableList } from './SnapshotsTableList';
import type { Site } from '@getflywheel/local';
interface Props {
	className: string;
	site: Site;
}

export const ToolsContent = ({ className, site }: Props) => (
	<div
		className={classnames(
			className,
			styles.ToolsContent,
		)}
	>
		<SnapshotsTableList site={site}/>
	</div>
);
