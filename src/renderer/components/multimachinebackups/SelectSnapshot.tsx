import React, {useRef} from 'react';
import {
	PrimaryButton,
	Title,
	VirtualTable,
	IVirtualTableCellRendererDataArgs,
	LoadingIndicator,
	TextButton,
	Tooltip,
	Button,
} from '@getflywheel/local-components';
import classnames from 'classnames';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import * as LocalRenderer from '@getflywheel/local/renderer';
import type { BackupSnapshot } from '../../../types';
import DateUtils from '../../helpers/DateUtils';
import { ProviderDropdown } from '../siteinfotools/ProviderDropdown';
import { ErrorBannerContainer } from './ErrorBannerContainer';
import styles from '../siteinfotools/SiteInfoToolsSection.scss';
import secondStyles from './SelectSnapshot.scss';
import virtualTableStyles from '../siteinfotools/SnapshotsTableList.scss';
import { LOCAL_ROUTES } from '../../../constants';
import {
	selectMultiMachineActiveSiteSnapshots,
	MULTI_MACHINE_SNAPSHOTS_HAS_MORE,
	LOADING_MULTI_MACHINE_SNAPSHOTS,
} from '../../store/multiMachineRestoreSlice';
import useOnScreen from '../../helpers/useOnScreen';

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
		{ key: 'radioselect', value: '', className: secondStyles.radioColumn },
		{ key: 'createdAt', value: 'Created', className: secondStyles.createdColumn },
		{ key: 'configObject', value: 'Description' },
	];

	const hasMore = currentSnapshotsPage < totalSnapshotsPages;

	const renderDate = (createdAt: string) => {
		const [monDayYear, time] = DateUtils.formatDate(createdAt);

		return (
			<div className={styles.SnapshotsTableList_DateCell}>
				<div className={virtualTableStyles.SnapshotsTableList_DateCell_MonDayYear}>
					{ monDayYear }
				</div>
				<div>
					{ time }
				</div>
			</div>
		);
	};

	const onRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const snapshotHash = event.currentTarget.value;
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
		<div>
			<label className={classnames(
				secondStyles.radio,
				secondStyles.radio__before,
			)}>
				<span className={secondStyles.radio__input}>
					<input
						type='radio'
						name='snapshotSelect'
						value={snapshot.hash}
						onChange={(value) => onRadioChange(value)}
						checked={selectedSnapshot ? selectedSnapshot.hash === snapshot.hash : false}
					/>
					<span className={secondStyles.radio__control}></span>
				</span>
				<span className={secondStyles.radio__label}></span>
			</label>
		</div>
	);

	const LoadMoreWhenVisibleCell = () => {
		const ref = useRef();
		const isVisible = useOnScreen(ref);

		if (isVisible && hasMore && !isLoading && !isErrored) {
			// asynchronous get snapshots given the site and provider
			store.dispatch(actions.requestSubsequentSnapshots());
		}

		return (
			<div
				ref={ref}
				className={secondStyles.SnapshotsTableList_LoadingCont}
			/>
		);
	};

	const renderCell = (dataArgs: IVirtualTableCellRendererDataArgs) => {
		const { colKey, cellData, isHeader, rowData } = dataArgs;
		const snapshot = dataArgs.rowData as BackupSnapshot;

		if (isHeader) {
			return cellData;
		}

		if (snapshot.hash === MULTI_MACHINE_SNAPSHOTS_HAS_MORE) {
			// don't render any cells other than the middle description/configObject one
			if (colKey !== 'configObject') {
				return null;
			}

			return <LoadMoreWhenVisibleCell />;
		} if (snapshot.hash === LOADING_MULTI_MACHINE_SNAPSHOTS) {
			// don't render any cells other than the middle description/configObject one
			if (colKey !== 'configObject') {
				return null;
			}

			return (
				<div className={secondStyles.SnapshotsTableList_LoadingCont}>
					<LoadingIndicator dots={3} />
				</div>
			);
		}

		switch (colKey) {
			case 'radioselect': return renderRadioButton(rowData);
			case 'createdAt': return renderDate(cellData);
			case 'configObject': return cellData.description;
		}
		return (
			<div>
				{ dataArgs.cellData }
			</div>
		);
	};

	return (
		<>
			<ErrorBannerContainer />
			<div className="AddSiteContent">
				<Title size="l" container={{ margin: 'l 0' }}>Select a {selectedSite.name} Cloud Backup</Title>
				<div className={secondStyles.innerContainer}>
					<div className={secondStyles.dropdownPadding}>
						<ProviderDropdown
							enabledProviders={individualSiteRepoProviders}
							activeSiteProvider={selectedProvider}
							multiMachineSelect={true}
						/>
					</div>
					<div className={secondStyles.virtualTablePlaceholder}>
						{isLoading && <LoadingIndicator className={secondStyles.loading} dots={3}/>}
						{!isLoading && allSnapshots.length &&
							<VirtualTable
								className={virtualTableStyles.SnapshotsTableList_VirtualTable}
								cellRenderer={renderCell}
								data={allSnapshots}
								extraData={{
									selectedSite,
									selectedProvider,
								}}
								headers={headers}
								headersCapitalize={'none'}
								headersWeight={500}
								rowHeightSize={70}
								rowHeaderHeightSize={'l'}
							/>
						}
						{!isLoading && !allSnapshots.length &&
							<div className={secondStyles.noProviderState}>
								No storage provider connected.
							</div>
						}
					</div>
				</div>
				{/* wrap button in tooltip if continue is disabled */}
				{continueDisabled
					?
					<Tooltip
						className={secondStyles.tooltip}
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
