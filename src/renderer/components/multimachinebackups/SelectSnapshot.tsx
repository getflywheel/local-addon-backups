import React, { useRef } from 'react';
import {
	PrimaryButton,
	Title,
	VirtualTable,
	IVirtualTableCellRendererDataArgs,
	LoadingIndicator,
	TextButton,
	Tooltip,
} from '@getflywheel/local-components';
import classnames from 'classnames';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import * as LocalRenderer from '@getflywheel/local/renderer';
import type { BackupSnapshot } from '../../../types';
import DateUtils from '../../helpers/DateUtils';
import { ProviderDropdown } from '../siteinfotools/ProviderDropdown';
import { ErrorBannerContainer } from './ErrorBannerContainer';
import { LOCAL_ROUTES } from '../../../constants';
import {
	selectMultiMachineActiveSiteSnapshots,
	MULTI_MACHINE_SNAPSHOTS_HAS_MORE,
} from '../../store/multiMachineRestoreSlice';
import useOnScreen from '../../helpers/useOnScreen';

import styles from './SelectSnapshot.scss';
import siteInfoToolsStyles from '../siteinfotools/SiteInfoToolsSection.scss';
import virtualTableStyles from '../siteinfotools/SnapshotsTableList.scss';

interface Props {
	updateSiteSettings: any
	siteSettings: any
}

export const SelectSnapshot = (props: Props) => {
	const { updateSiteSettings, siteSettings } = props;
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const allSnapshots = useStoreSelector(selectMultiMachineActiveSiteSnapshots);
	const {
		selectedProvider,
		selectedSite,
		selectedSnapshot,
		isLoading,
		isLoadingMoreSnapshots,
		individualSiteRepoProviders,
		currentSnapshotsPage,
		totalSnapshotsPages,
		isErrored,
	} = state;

	/**
	 * The columns defined in order and with the intended header text.
	 */
	const headers: React.ComponentProps<typeof VirtualTable>['headers'] = [
		{ key: 'radioselect', value: '', className: classnames(
			styles.radioColumn,
		) },
		{ key: 'createdAt', value: 'Created', className: classnames(
			styles.createdColumn,
		) },
		{ key: 'configObject', value: 'Description' },
	];

	const hasMore = currentSnapshotsPage < totalSnapshotsPages;

	const renderDate = (createdAt: string, rowSelected: boolean) => {
		const [monDayYear, time] = DateUtils.formatDate(createdAt);
		return (
			<div className={classnames(
				styles.createdColumn,
				siteInfoToolsStyles.SnapshotsTableList_DateCell,
				(!rowSelected)
					? styles.faded
					: undefined
			)}>
				<div className={virtualTableStyles.SnapshotsTableList_DateCell_MonDayYear}>
					{ monDayYear }
				</div>
				<div>
					{ time }
				</div>
			</div>
		);
	};

	const onRowSelect = (dataArgs: IVirtualTableCellRendererDataArgs) => {
		const snapshotHash = dataArgs.rowData.hash;
		const selectedSnapshot = allSnapshots.find((snapshot) => snapshotHash === snapshot.hash);
		store.dispatch(actions.setSelectedSnapshot(selectedSnapshot));

		updateSiteSettings({
			...siteSettings,
			cloudBackupMeta: {
				...siteSettings.cloudBackupMeta,
				createdFromCloudBackup: true,
				snapshotID: snapshotHash,
				provider: selectedProvider,
			},
		});
	};

	const onContinue = () => {
		LocalRenderer.sendIPCEvent('goToRoute', LOCAL_ROUTES.ADD_SITE_ENVIRONMENT);
	};

	const onGoBack = () => {
		store.dispatch(actions.setSelectedSnapshot(null));
		store.dispatch(actions.setSelectedProvider(null));

		LocalRenderer.sendIPCEvent('goToRoute', LOCAL_ROUTES.ADD_SITE_BACKUP_SITE);
	};

	const continueDisabled = (selectedSnapshot === null);

	const renderRadioButton = (snapshot: BackupSnapshot) => (
		<div className={styles.radioColumn}>
			<label className={classnames(
				styles.radio,
				styles.radio__before,
			)}>
				<span className={styles.radio__input}>
					<input
						type='radio'
						name='snapshotSelect'
						value={snapshot.hash}
						checked={selectedSnapshot ? selectedSnapshot.hash === snapshot.hash : false}
					/>
					<span className={styles.radio__control}></span>
				</span>
				<span className={styles.radio__label}></span>
			</label>
		</div>
	);


	const LoadMoreWhenVisibleCell = () => {
		const ref = useRef();
		const isVisible = useOnScreen(ref);

		if (isVisible && hasMore && !isLoading && !isErrored) {
			store.dispatch(actions.requestSubsequentSnapshots());
		}

		return (
			<div
				ref={ref}
				className={styles.SnapshotsTableList_LoadingCont}
			/>
		);
	};

	// wrap each row in a click event handler that will save snapshot to state
	const renderRow = (dataArgs: IVirtualTableCellRendererDataArgs) => (
		<div
			className={styles.rowRenderer}
			onClick={() => onRowSelect(dataArgs)}
		>
			{ dataArgs.children }
		</div>
	);

	const renderCell = (dataArgs: IVirtualTableCellRendererDataArgs) => {
		const { colKey, cellData, isHeader, rowData } = dataArgs;
		const snapshot = dataArgs.rowData as BackupSnapshot;
		const currentSnapshotRowHash = dataArgs.rowData?.hash;
		const rowSelected = currentSnapshotRowHash === selectedSnapshot?.hash;

		if (isHeader) {
			return cellData;
		}

		// responsible for the "auto load more snapshots" functionality
		if (snapshot.hash === MULTI_MACHINE_SNAPSHOTS_HAS_MORE) {
			// don't render any cells other than the middle description/configObject one
			if (colKey !== 'createdAt') {
				return null;
			}

			return <LoadMoreWhenVisibleCell />;
		}

		switch (colKey) {
			case 'radioselect': return renderRadioButton(rowData);
			case 'createdAt': return renderDate(cellData, rowSelected);
			case 'configObject':
				return (
					<div className={
						(!rowSelected)
							? styles.faded
							: undefined
					}>
						{cellData.description}
					</div>
				);
		}
		return (
			<div>
				{ cellData }
			</div>
		);
	};

	return (
		<>
			<ErrorBannerContainer />
			<div className="AddSiteContent">
				<Title size="l" container={{ margin: 'l 0' }}>Select a {selectedSite?.name} Cloud Backup</Title>
				<div className={styles.innerContainer}>

					{!isLoading && <div className={styles.dropdownPadding}>
						<ProviderDropdown
							enabledProviders={individualSiteRepoProviders}
							activeSiteProvider={selectedProvider}
							multiMachineSelect={true}
						/>
					</div>}

					<div className={styles.virtualTablePlaceholder}>
						{isLoading && <LoadingIndicator big={true} className={styles.loading} dots={3}/>}
						{!isLoading && allSnapshots.length &&
							<VirtualTable
								className={virtualTableStyles.SnapshotsTableList_VirtualTable}
								cellRenderer={renderCell}
								rowRenderer={renderRow}
								data={allSnapshots}
								extraData={{
									selectedSite,
									selectedProvider,
									selectedSnapshot,
								}}
								headers={headers}
								headersCapitalize={'none'}
								headersWeight={500}
								rowHeightSize={70}
								rowHeaderHeightSize={'l'}
							/>
						}
						{!isLoading && !allSnapshots.length &&
							<div className={styles.noProviderState}>
								No storage provider connected.
							</div>
						}
					</div>

					<div className={styles.loadingMoreSnapshotsContainer}>
						<div className={styles.SnapshotsTableList_LoadingCont}>
							{isLoadingMoreSnapshots && <LoadingIndicator dots={3} />}
						</div>
					</div>

				</div>
				{/* wrap button in tooltip if continue is disabled */}
				{continueDisabled
					?
					<Tooltip
						className={styles.tooltip}
						content={(
							<>
								Please select a backup before continuing.
							</>
						)}
						popperOffsetModifier={{ offset: [0, 0] }}
						position="top-start"
					>
						<PrimaryButton
							className="Continue"
							onClick={onContinue}
							disabled={continueDisabled}
						>
							Continue
						</PrimaryButton>
					</Tooltip>
					:
					<PrimaryButton
						className="Continue"
						onClick={onContinue}
						disabled={continueDisabled}
					>
						Continue
					</PrimaryButton>
				}
				<TextButton
					className="GoBack"
					onClick={onGoBack}
				>
					Go Back
				</TextButton>
			</div>
		</>
	);
};
