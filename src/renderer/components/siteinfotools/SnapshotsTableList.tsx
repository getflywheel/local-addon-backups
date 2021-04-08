import React from 'react';
import styles from './SnapshotsTableList.scss';
import {
	DotsIcon,
	FlyDropdown,
	IVirtualTableCellRendererDataArgs,
	IVirtualTableRowRendererDataArgs,
	VirtualTable,
} from '@getflywheel/local-components';
import { useStoreSelector } from '../../store/store';
import type { BackupSnapshot } from '../../../types';
import { ipcAsync } from '@getflywheel/local/renderer';

type ColKey = keyof BackupSnapshot;

/**
 * The columns defined in order and with the intended header text.
 */
const headers: React.ComponentProps<typeof VirtualTable>['headers'] = [
	'updatedAt',
	'description',
	'moremenu',
];

const headerIndexByColKey = headers.reduce(
	(acc, value, index) => {
		acc[value as string] = index;
		return acc;
	},
	{} as {[key in ColKey]: number},
);

const renderRow = (dataArgs: IVirtualTableRowRendererDataArgs) => (
	<div className={styles.SnapshotsTableList_Row}>
		{dataArgs.children}
	</div>
);

const renderCellMoreMenu = (snapshot: BackupSnapshot) => (
	<FlyDropdown
		caret={false}
		items={[{
			color: 'none',
			label: 'Restore site to this backup',
			onClick: () => ipcAsync(
				'backups:restore-site-clone',
				snapshot.hash,
			),
		}, {
			color: 'none',
			label: 'Clone site from backup',
			onClick: () => console.log('onClick'),
		}, {
			color: 'none',
			label: 'Edit backup description',
			onClick: () => console.log('onClick'),
		}]}
		style={{ display: 'block', textAlign: 'right' }} // todo: move to stylesheet
	>
		<DotsIcon />
	</FlyDropdown>
);

const renderCell = (dataArgs: IVirtualTableCellRendererDataArgs) => {
	const { colKey, cellData, isHeader } = dataArgs;
	const snapshot = dataArgs.rowData as BackupSnapshot;

	switch (colKey) {
		case headerIndexByColKey['description']: return isHeader ? 'Description' : cellData;
		case headerIndexByColKey['moremenu']: return isHeader ? '' : renderCellMoreMenu(snapshot);
		case headerIndexByColKey['updatedAt']: return isHeader ? 'Created' : new Date(cellData).toLocaleDateString();
	}

	return (
		<div>
			{ dataArgs.cellData }
		</div>
	);
};

export const SnapshotsTableList = () => {
	const {
		id,
		isLoadingSnapshots,
		snapshots,
	} = useStoreSelector((state) => state.activeSite);

	return (
		<div className={styles.SnapshotsTableList}>
			snaps is loading: { JSON.stringify(isLoadingSnapshots) }

			{!snapshots?.length && (
				<div className={styles.SiteInfoToolsSection_Content_Empty}>
					There are no backups created for this site yet.
				</div>
			)}

			<VirtualTable
				cellRenderer={renderCell}
				data={snapshots}
				headers={headers}
				rowHeightSize={'l'}
				rowHeaderHeightSize={'l'}
			/>
		</div>
	);
}
