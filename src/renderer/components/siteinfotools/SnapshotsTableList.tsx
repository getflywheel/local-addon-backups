import React from 'react';
import styles from './SnapshotsTableList.scss';
import {
	DotsIcon,
	FlyDropdown,
	IVirtualTableCellRendererDataArgs,
	LoadingIndicator,
	TextButton,
	VirtualTable,
} from '@getflywheel/local-components';
import { useStoreSelector } from '../../store/store';
import type { BackupSnapshot, HubProviderRecord } from '../../../types';
import { ipcAsync } from '@getflywheel/local/renderer';
import DateUtils from '../../helpers/DateUtils';
import type { Site } from '@getflywheel/local';
import { createBackupCloneModal } from '../BackupRestoreCloneModal';
import { Providers } from '../../../types';
import { selectors } from '../../store/selectors';
interface Props {
	site: Site;
}

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

const formatDateTimeAmPm = (date: Date): string => {
	var hours = date.getHours();
	var minutes: number | string = date.getMinutes();
	var ampm = hours >= 12 ? 'p.m.' : 'a.m.';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0' + minutes : minutes;
	var strTime = hours + ':' + minutes + ' ' + ampm;

	return strTime;
}

const formatDate = (updatedAt: string) => {
	const date = new Date(updatedAt);

	return [
		DateUtils.format(date.getTime(), 'mon', 'd', 'yyyy', ' '),
		formatDateTimeAmPm(date),
	];
}

const renderDate = (updatedAt: string) => {
	const [monDayYear, time] = formatDate(updatedAt);

	return (
		<div className={styles.SnapshotsTableList_DateCell}>
			<div className={styles.SnapshotsTableList_DateCell_MonDayYear}>
				{ monDayYear }
			</div>
			<div>
				{ time }
			</div>
		</div>
	)
}

const renderTextButton = (label: React.ReactNode) => (
	<TextButton
		className={styles.SnapshotsTableList_MoreDropdown_Item_TextButton}
		privateOptions={{
			fontWeight: 'medium',
			textTransform: 'none',
		}}
	>
		{ label }
	</TextButton>
);

const onCloneModalSubmit = (baseSite: Site, newSiteName: string, provider: Providers, snapshotHash: string) => {
	console.log(baseSite, newSiteName, provider, snapshotHash, 'hello this is tyler');

	ipcAsync(
		'backups:restore-site-clone',
		baseSite,
		newSiteName,
		provider,
		snapshotHash,
	);
};

const renderCellMoreMenu = (snapshot: BackupSnapshot, site: Site, provider: HubProviderRecord) => (
	<FlyDropdown
		caret={false}
		className={styles.SnapshotsTableList_MoreDropdown}
		items={[{
			color: 'none',
			content: renderTextButton('Restore site to this backup'),
			onClick: () => ipcAsync(
				'backups:restore-site-clone',
				snapshot.hash,
			),
		}, {
			color: 'none',
			content: renderTextButton('Clone site from backup'),
			label: 'Clone site from backup',
			onClick: () => createBackupCloneModal(
				onCloneModalSubmit,
				site,
				snapshot,
				provider,
			),
		}, {
			color: 'none',
			content: renderTextButton('Edit backup description'),
			onClick: () => console.log('onClick'),
		}]}
		popperOptions={{ popperOffsetModifier: { offset: [15, 0] } } }
	>
		<DotsIcon />
	</FlyDropdown>
);

const renderCell = (dataArgs: IVirtualTableCellRendererDataArgs) => {
	const { colKey, cellData, isHeader, extraData } = dataArgs;
	const snapshot = dataArgs.rowData as BackupSnapshot;

	switch (colKey) {
		case headerIndexByColKey['description']: return isHeader ? 'Description' : cellData;
		case headerIndexByColKey['moremenu']: return isHeader ? '' : renderCellMoreMenu(snapshot, extraData.site, extraData.provider);
		case headerIndexByColKey['updatedAt']: return isHeader ? 'Created' : new Date(cellData).toLocaleDateString();
	}

	return (
		<div>
			{ dataArgs.cellData }
		</div>
	);
};

export const SnapshotsTableList = ({ site }: Props) => {
	const {
		isLoadingSnapshots,
		snapshots,
	} = useStoreSelector((state) => state.activeSite);
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);

	if (isLoadingSnapshots) {
		return (
			<div className={styles.SnapshotsTableList_LoadingCont}>
				<LoadingIndicator color="Gray" dots={3} />
			</div>
		);
	}

	if (!snapshots?.length) {
		return (
			<div className={styles.SnapshotsTableList_EmptyCont}>
				<span>
					There are no backups created for this site yet.
				</span>
			</div>
		);
	}

	return (
		<div className={styles.SnapshotsTableList}>
			<VirtualTable
				cellRenderer={renderCell}
				className={styles.SnapshotsTableList_VirtualTable}
				data={snapshots}
				extraData={{
					site,
					provider: activeSiteProvider,
				}}
				headers={headers}
				headersCapitalize={'none'}
				headersWeight={500}
				rowHeightSize={70}
				rowHeaderHeightSize={'l'}
			/>
		</div>
	);
}
