import React from 'react';
import styles from './SnapshotsTableList.scss';
import {
	DotsIcon,
	FlyDropdown,
	IVirtualTableCellRendererDataArgs,
	LoadingIndicator,
	Spinner,
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

/**
 * The columns defined in order and with the intended header text.
 */
const headers: React.ComponentProps<typeof VirtualTable>['headers'] = [
	{ key: 'updatedAt', value: 'Created', className: styles.SnapshotsTableList_Column_Created },
	{ key: 'configObject', value: 'Description', className: styles.SnapshotsTableList_Column_Description },
	{ key: 'moremenu', value: '', className: styles.SnapshotsTableList_Column_More },
];

// protected _headers = [
// 	{ key: 'locked', value: '', className: styles.MagicSyncViewer_Column_Locked },
// 	{ key: 'selected', value: 'Is Selected', className: styles.MagicSyncViewer_Column_Selected },
// 	{ key: 'filename', value: 'Filename', className: styles.MagicSyncViewer_Column_Filename },
// 	{ key: 'localInfoStatus', value: 'Local', className: styles.MagicSyncViewer_Column_LocalDate },
// 	{ key: 'gtlt', value: '', className: styles.MagicSyncViewer_Column_DateIcons },
// 	{ key: 'remoteSiteInfoStatus', value: 'tbd', className: styles.MagicSyncViewer_Column_RemoteSiteDate },
// ];

const renderDate = (updatedAt: string, snapshot: BackupSnapshot) => {
	if (snapshot.status === 'started') {
		return (
			<div>
				<Spinner className={styles.SnapshotsTableList_DateCell_Spinner}>
					In progress
				</Spinner>
			</div>
		);
	}

	const [monDayYear, time] = DateUtils.formatDate(updatedAt);

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

	if (isHeader) {
		return cellData;
	}

	switch (colKey) {
		case 'configObject': return cellData.description;
		case 'moremenu': return renderCellMoreMenu(snapshot, site, provider);
		case 'updatedAt': return renderDate(cellData, snapshot);
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
	} = useStoreSelector((state) => state.activeSite);
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);
	const snapshotsPlusBackingupPlaceholder = useStoreSelector(selectors.selectSnapshotsPlusBackingupPlaceholder);

	if (isLoadingSnapshots) {
		return (
			<div className={styles.SnapshotsTableList_LoadingCont}>
				<LoadingIndicator color="Gray" dots={3} />
			</div>
		);
	}

	if (!snapshotsPlusBackingupPlaceholder?.length) {
		return (
			<div className={styles.SnapshotsTableList_EmptyCont}>
				<span>
					{activeSiteProvider
						? `There are no backups created on ${activeSiteProvider.name} for this site yet.`
						: 'There are no backups created for this site yet.'
					}
				</span>
			</div>
		);
	}

	return (
		<div className={styles.SnapshotsTableList}>
			<VirtualTable
				cellRenderer={renderCell}
				className={styles.SnapshotsTableList_VirtualTable}
				data={snapshotsPlusBackingupPlaceholder}
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
