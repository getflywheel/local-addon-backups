import React from 'react';
import {
	CheckmarkIcon,
	FlyDropdown,
	TextButton,
} from '@getflywheel/local-components';
import styles from './ProviderDropdown.scss';
import LoginIconExternalLinkSvg from '../../assets/external-link.svg';
import GoogleDriveIcon from '../../assets/google-drive.svg';
import DropboxIcon from '../../assets/dropbox.svg';
import type { HubProviderRecord } from '../../../types';
import { HubOAuthProviders } from '../../../types';
import classnames from 'classnames';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';
import {
	actions,
	store,
} from '../../store/store';

interface Props {
	offline: boolean,
	enabledProviders: HubProviderRecord[];
	activeSiteProvider: HubProviderRecord;
	multiMachineSelect: boolean;
	siteId?: string;
}

const renderProviderIcon = (provider: HubProviderRecord): React.ReactNode => {
	switch (provider.id) {
		case HubOAuthProviders.Dropbox:
			return <DropboxIcon className={styles.ProviderDropdown_Content_ProviderSvg} />;
		case HubOAuthProviders.Google:
			return <GoogleDriveIcon className={styles.ProviderDropdown_Content_ProviderSvg} />;
		default:
			return null;
	}
};

const renderTextButton = (label: React.ReactNode, value: React.ReactNode, deactivateLabel?: boolean) => (
	<TextButton
		className={classnames(
			styles.ProviderDropdown_Item_TextButton,
			{
				[styles.ProviderDropdown_Item_TextButton__Deactivated]: deactivateLabel,
			},
		)}
		privateOptions={{
			fontWeight: 'medium',
			textTransform: 'none',
		}}
	>
		<span className={styles.ProviderDropdown_Item_TextButton_Label}>
			{ label }
		</span>
		<span className={styles.ProviderDropdown_Item_TextButton_Value}>
			{ value }
		</span>
	</TextButton>
);

const renderDropdownConnectItem = (label?: string) => renderTextButton(
	label,
	<LoginIconExternalLinkSvg className={styles.TextButtonExternal_Svg} />,
);

const renderDropdownProviderItem = (provider?: HubProviderRecord, isActiveProvider?: boolean) => renderTextButton(
	provider?.name,
	provider && isActiveProvider
		? (
			<CheckmarkIcon className={styles.ProviderDropdown_Item_TextButton_CheckmarkSvg} />
		)
		: 'Select',
	isActiveProvider,
);

export const ProviderDropdown = (props: Props) => {
	const { offline, enabledProviders, activeSiteProvider, multiMachineSelect, siteId } = props;
	const dropdownItems: React.ComponentProps<typeof FlyDropdown>['items'] = [];
	if (offline) {
		dropdownItems.push({
			color: 'none',
			content: <>Check internet connection</>,
			onClick: null,
		});
	} else if (enabledProviders?.length) {
		enabledProviders.forEach((provider) => {
			dropdownItems.push({
				color: 'none',
				content: renderDropdownProviderItem(provider, activeSiteProvider === provider),
				onClick: multiMachineSelect
					? () => store.dispatch(actions.setMultiMachineProviderAndUpdateSnapshots(provider))
					: () => store.dispatch(actions.updateBackupProviderPersistAndUpdateSnapshots({
						siteId,
						providerId: provider.id,
					})),
			});
		});

		if (!multiMachineSelect) {
			dropdownItems.push({
				color: 'none',
				content: renderDropdownConnectItem('Add or Manage Provider'),
				onClick: launchBrowserToHubBackups,
			});
		}
	} else {
		dropdownItems.push({
			color: 'none',
			content: renderDropdownConnectItem('Connect Provider'),
			onClick: launchBrowserToHubBackups,
		});
	}

	return (
		<div className={styles.ProviderDropdown_Cont}>
			<span className={styles.ProviderDropdown_Label}>
				{multiMachineSelect ? 'Create new site from' : 'Back up to'}
			</span>
			<FlyDropdown
				className={classnames(styles.ProviderDropdown, { [styles.ProviderDropdownOffline]: offline })}
				classNameList={styles.ProviderDropdown_List}
				classNameListItem={classnames({ [styles.DropdownItemOffline]: offline })}
				items={dropdownItems}
				position="bottom"
				useClickInsteadOfHover={!offline}
			>
				{enabledProviders?.length && activeSiteProvider
					? (
						<>
							{renderProviderIcon(activeSiteProvider)}
							{activeSiteProvider.name}
						</>
					)
					: 'select provider'
				}
			</FlyDropdown>
		</div>
	);
};
