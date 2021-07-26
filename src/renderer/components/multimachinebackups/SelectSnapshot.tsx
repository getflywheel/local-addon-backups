import React from 'react';
import {
	PrimaryButton,
	Title,
	VirtualTable,
	IVirtualTableCellRendererDataArgs,
	LoadingIndicator,
} from '@getflywheel/local-components';
import { store, actions, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import * as LocalRenderer from '@getflywheel/local/renderer';
import type { BackupSnapshot } from '../../../types';
import DateUtils from '../../helpers/DateUtils';
import styles from '../siteinfotools/SiteInfoToolsSection.scss';
import { ProviderDropdown } from '../siteinfotools/ProviderDropdown';


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
	console.log(state);

	/**
	 * The columns defined in order and with the intended header text.
	 */
	const headers: React.ComponentProps<typeof VirtualTable>['headers'] = [
		{ key: 'radioselect', value: '' },
		{ key: 'created_at', value: 'Created' },
		{ key: 'configObject', value: 'Description' },
	];

	const renderDate = (createdAt: string) => {
		const [monDayYear, time] = DateUtils.formatDate(createdAt);

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

	const continueDisabled = (selectedSnapshot === null);

	const renderRadioButton = (snapshot: BackupSnapshot) => (
		<div >
			<input
				type='radio'
				name='snapshotSelect'
				value={snapshot.hash}
				onChange={(value) => onRadioChange(value)}
			/>
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

	if (isLoading) {
		return (
			<div className="AddSiteContent">
				<div className="Inner">
					<LoadingIndicator big={true} dots={3}/>
				</div>
			</div>
		);
	}

	return (
		<div className="AddSiteContent">
			<Title size="l" container={{ margin: 'l 0' }}>Select a {selectedSite.name} Cloud Backup</Title>
			<div className="Inner">
				<ProviderDropdown
					enabledProviders={individualSiteRepoProviders}
					activeSiteProvider={selectedProvider}
					multiMachineSelect={true}
				/>
				<VirtualTable
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
			</div>
			<PrimaryButton
				className="Continue"
				onClick={onContinue}
				disabled={continueDisabled}
			>
				Continue
			</PrimaryButton>
		</div>
	);
};
