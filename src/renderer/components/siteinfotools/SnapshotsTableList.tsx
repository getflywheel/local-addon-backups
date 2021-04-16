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
import DateUtils from '../../helpers/DateUtils';
import type { Site } from '@getflywheel/local';
import { BackupCloneContents } from '../modals/BackupCloneContents';
import { BackupRestoreContents } from '../modals/BackupRestoreContents';
import { createModal } from '../createModal';
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
	let hours = date.getHours();
	let minutes: number | string = date.getMinutes();
	const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0' + minutes : minutes;
	const strTime = hours + ':' + minutes + ' ' + ampm;

	return strTime;
};

const formatDate = (updatedAt: string) => {
	const date = new Date(updatedAt);

	return [
		DateUtils.format(date.getTime(), 'mon', 'd', 'yyyy', ' '),
		formatDateTimeAmPm(date),
	];
};

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
	);
};

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

const renderCellMoreMenu = (snapshot: BackupSnapshot, site: Site, provider: HubProviderRecord) => (
	<FlyDropdown
		caret={false}
		className={styles.SnapshotsTableList_MoreDropdown}
		items={[{
			color: 'none',
			content: renderTextButton('Restore site to this backup'),
			onClick: () => createModal(
				() => (
					<BackupRestoreContents
						site={site}
						snapshot={snapshot}
					/>
				),
			),
		}, {
			color: 'none',
			content: renderTextButton('Clone site from backup'),
			onClick: () => createModal(
				() => (
					<BackupCloneContents
						site={site}
						snapshot={snapshot}
						provider={provider}
					/>
				),
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
	const { site, provider } = extraData;
	const snapshot = dataArgs.rowData as BackupSnapshot;

	switch (colKey) {
		case headerIndexByColKey['description']: return isHeader ? 'Description' : cellData;
		case headerIndexByColKey['moremenu']: return isHeader ? '' : renderCellMoreMenu(snapshot, site, provider);
		case headerIndexByColKey['updatedAt']: return isHeader ? 'Created' : renderDate(cellData);
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
};
