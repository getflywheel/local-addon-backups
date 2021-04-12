import React from 'react';
import styles from './ToolsContent.scss';
import classnames from 'classnames';
import { SnapshotsTableList } from './SnapshotsTableList';

interface Props {
	className: string;
}

export const ToolsContent = ({ className }: Props) => {
	return (
		<div
			className={classnames(
				className,
				styles.ToolsContent,
			)}
		>
			<SnapshotsTableList />
		</div>
	);
}
