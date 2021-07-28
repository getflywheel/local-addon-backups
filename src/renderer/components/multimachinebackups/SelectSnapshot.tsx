import React from 'react';
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
import styles from '../siteinfotools/SiteInfoToolsSection.scss';
import secondStyles from './SelectSnapshot.scss';
import virtualTableStyles from '../siteinfotools/SnapshotsTableList.scss';

interface Props {
	updateSiteSettings: any
	siteSettings: any
}

export const SelectSnapshot = (props: Props) => {
	const { updateSiteSettings, siteSettings } = props;
	const state = useStoreSelector(selectors.selectMultiMachineSliceState);
	const {
		selectedProvider,
		selectedSite,
		backupSnapshots,
		selectedSnapshot,
		isLoading,
		individualSiteRepoProviders,

	} = state;

	/**
	 * The columns defined in order and with the intended header text.
	 */
	const headers: React.ComponentProps<typeof VirtualTable>['headers'] = [
		{ key: 'radioselect', value: '', className: secondStyles.radioColumn },
		{ key: 'created_at', value: 'Created', className: secondStyles.createdColumn },
		{ key: 'configObject', value: 'Description' },
	];

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
		const selectedSnapshot = backupSnapshots.find((snapshot) => snapshotHash === snapshot.hash);
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
		LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/environment');
	};

	const onGoBack = () => {
		LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/select-site-backup');
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
					/>
					<span className={secondStyles.radio__control}></span>
				</span>
				<span className={secondStyles.radio__label}></span>
			</label>
		</div>
	);

	const renderCell = (dataArgs: IVirtualTableCellRendererDataArgs) => {
		const { colKey, cellData, isHeader, rowData } = dataArgs;

		if (isHeader) {
			return cellData;
		}

		switch (colKey) {
			case 'radioselect': return renderRadioButton(rowData);
			case 'configObject': return cellData.description;
			case 'created_at': return renderDate(cellData);
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
						{isLoading &&
							<LoadingIndicator className={secondStyles.loading} big={true} dots={3}/>
						}
						{!isLoading && backupSnapshots.length &&
							<VirtualTable
								className={virtualTableStyles.SnapshotsTableList_VirtualTable}
								cellRenderer={renderCell}
								data={backupSnapshots}
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
						{!isLoading && !backupSnapshots.length &&
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
