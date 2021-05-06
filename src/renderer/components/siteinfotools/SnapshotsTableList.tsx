import React from 'react';
import styles from './SnapshotsTableList.scss';
import {
	CircleWarnIcon,
	DotsIcon,
	FlyDropdown,
	IVirtualTableCellRendererDataArgs,
	LoadingIndicator,
	Spinner,
	TextButton,
	VirtualTable,
} from '@getflywheel/local-components';
import { actions, store, useStoreSelector } from '../../store/store';
import type { BackupSnapshot, HubProviderRecord } from '../../../types';
import DateUtils from '../../helpers/DateUtils';
import type { Site } from '@getflywheel/local';
import { BackupCloneContents } from '../modals/BackupCloneContents';
import { BackupRestoreContents } from '../modals/BackupRestoreContents';
import { createModal } from '../createModal';
import { selectors } from '../../store/selectors';
import {
	selectActivePagingDetails,
	selectSnapshotsForActiveSitePlusExtra,
	TABLEROW_HASH_IS_SPECIAL_PAGING_HAS_MORE, TABLEROW_HASH_IS_SPECIAL_PAGING_IS_LOADING
} from '../../store/snapshotsSlice';
import { getSnapshotsForActiveSiteProviderHub } from '../../store/thunks';

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

const renderDate = (updatedAt: string, snapshot: BackupSnapshot) => {
	if (snapshot.status === 'started') {
		return (
			<div>
				<Spinner className={styles.SnapshotsTableList_DateCell_Spinner}>
					In progress
				</Spinner>
			</div>
		);
	} if (snapshot.status === 'errored') {
		return (
			<div className={styles.SnapshotsTableList_DateCell_WarningCont}>
				<CircleWarnIcon />
				Failed
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

const renderTextButton = (label: React.ReactNode, isDisabled: () => boolean) => (
	<TextButton
		style={{ pointerEvents: store.getState().director.backupIsRunning ? 'none' : 'auto' }}
		disabled={isDisabled()}
		className={styles.SnapshotsTableList_MoreDropdown_Item_TextButton}
		privateOptions={{
			fontWeight: 'medium',
			textTransform: 'none',
		}}
	>
		{ label }
	</TextButton>
);

const renderCellMoreMenu = (snapshot: BackupSnapshot, site: Site, provider: HubProviderRecord) => {
	const items: React.ComponentProps<typeof FlyDropdown>['items'] = [];

	if (snapshot.hash === TABLEROW_HASH_IS_SPECIAL_PAGING_HAS_MORE) {
		return null;
	}

	switch (snapshot.status) {
		case 'started':
		case 'running':
			break;
		case 'errored':
			items.push({
				color: 'none',
				content: renderTextButton('Retry', () => false),
				onClick: () => store.dispatch(actions.backupSite({
					description: snapshot.configObject.description,
					providerId: provider.id,
					siteId: site.id,
					siteName: site.name,
				})),
			});
			items.push({
				color: 'none',
				content: renderTextButton('Dismiss', () => false),
				onClick: () => store.dispatch(actions.dismissBackupAttempt()),
			});
			items.push({
				color: 'none',
				content: renderTextButton('Dismiss', () => false),
				onClick: () => store.dispatch(actions.dismissBackupAttempt()),
			});
			break;
		case 'complete':
		default:
			items.push({
				color: 'none',
				content: renderTextButton('Restore site to this Cloud Backup', () => store.getState().director.backupIsRunning),
				onClick: store.getState().director.backupIsRunning
					? () => undefined
					: () => createModal(
						() => (
							<BackupRestoreContents
								site={site}
								snapshot={snapshot}
							/>
						),
					),
			});
			items.push({
				color: 'none',
				content: renderTextButton('Clone site from Cloud Backup', () => store.getState().director.backupIsRunning),
				onClick: store.getState().director.backupIsRunning
					? () => undefined
					: () => createModal(
						() => (
							<BackupCloneContents
								site={site}
								snapshot={snapshot}
								provider={provider}
							/>
						),
					),
			});
			items.push({
				color: 'none',
				content: renderTextButton('Edit description', () => false),
				onClick: () => console.log('onClick'),
			});
	}

	if (!items.length) {
		return null;
	}

	return (
		<FlyDropdown
			caret={false}
			className={styles.SnapshotsTableList_MoreDropdown}
			items={items}
			popperOptions={{ popperOffsetModifier: { offset: [15, 0] } }}
		>
			<DotsIcon/>
		</FlyDropdown>
	);
};

const renderCell = (dataArgs: IVirtualTableCellRendererDataArgs) => {
	const { colKey, cellData, isHeader, extraData } = dataArgs;
	const { site, provider } = extraData;
	const snapshot = dataArgs.rowData as BackupSnapshot;

	if (isHeader) {
		return cellData;
	}

	if (snapshot.hash === TABLEROW_HASH_IS_SPECIAL_PAGING_HAS_MORE) {
		// don't render any cells other than the middle description/configObject one
		if (colKey !== 'configObject') {
			return null;
		}

		// todo - crum: style this!!!
		return (
			<div
				onClick={() => {
					// asynchronous get snapshots given the site and provider
					store.dispatch(getSnapshotsForActiveSiteProviderHub({
						siteId: site.id,
						pageOffset: store.getState().snapshots.pagingBySite[site.id]?.offset + 1,
					}));
				}}
				className={styles.SnapshotsTableList_DateCell_WarningCont}
			>
				HAS MORE
			</div>
		);
	} if (snapshot.hash === TABLEROW_HASH_IS_SPECIAL_PAGING_IS_LOADING) {
		// don't render any cells other than the middle description/configObject one
		if (colKey !== 'configObject') {
			return null;
		}

		return (
			<div className={styles.SnapshotsTableList_LoadingCont}>
				<LoadingIndicator dots={3} />
			</div>
		);
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
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);
	const snapshotsPlusBackingupPlaceholder = useStoreSelector(selectSnapshotsForActiveSitePlusExtra);
	const activePagingDetails = useStoreSelector(selectActivePagingDetails);

	if (activePagingDetails?.isLoading && activePagingDetails.offset === 0) {
		return (
			<div className={styles.SnapshotsTableList_LoadingCont}>
				<LoadingIndicator dots={3} />
			</div>
		);
	}

	if (!snapshotsPlusBackingupPlaceholder?.length) {
		return (
			<div className={styles.SnapshotsTableList_EmptyCont}>
				<span>
					{activeSiteProvider
						? `There are no Cloud Backups created on ${activeSiteProvider.name} for this site yet.`
						: 'There are no Cloud Backups created for this site yet.'
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
