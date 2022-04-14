import React from 'react';
import {
	CheckmarkIcon,
	FlyDropdown,
	TextButton,
	TextButtonExternal,
	ExternalLinkIcon,
} from '@getflywheel/local-components';
import styles from './ProviderDropdown.scss';
import GoogleDriveIcon from '../../assets/google-drive.svg';
import DropboxIcon from '../../assets/dropbox.svg';
import type { HubProviderRecord } from '../../../types';
import { HubOAuthProviders } from '../../../types';
import classnames from 'classnames';
import {
	actions,
	store,
} from '../../store/store';
import { URLS } from '../../../constants';
interface Props {
	offline?: boolean,
	enabledProviders: HubProviderRecord[];
	activeSiteProvider: HubProviderRecord;
	multiMachineSelect: boolean;
	siteId?: string;
}

const renderProviderIcon = (provider: HubProviderRecord): React.ReactNode => {
	switch (provider?.id) {
		case HubOAuthProviders.Dropbox:
			return () => <DropboxIcon className={styles.ProviderDropdown_Content_ProviderSvg} />;
		case HubOAuthProviders.Google:
			return () => <GoogleDriveIcon className={styles.ProviderDropdown_Content_ProviderSvg} />;
		default:
			return null;
	}
};

const renderTextButton = (label: React.ReactNode, value: React.ReactNode, deactivateLabel?: boolean, href?: string) => (
	href ? (
		<TextButtonExternal
			href={href}
			className={classnames(
				styles.ProviderDropdown_Item_TextButton,
				{
					[styles.ProviderDropdown_Item_TextButton__Deactivated]: deactivateLabel,
				},
			)}
			rightIcon={value}
		>
			<span className={styles.ProviderDropdown_Item_TextButton_Label}>
				{ label }
			</span>
		</TextButtonExternal>
	) : (
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
	));

const renderDropdownConnectItem = (label?: string, href?: string) => renderTextButton(
	label,
	() => <ExternalLinkIcon className={classnames(styles.TextButtonExternal_Svg, styles.ProviderDropdown_Item_TextButton_Value)} />,
	false,
	href,
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
				content: renderDropdownConnectItem('Add or Manage Provider', URLS.LOCAL_HUB_BACKUPS),
				onClick: null,
			});
		}
	} else {
		dropdownItems.push({
			color: 'none',
			content: renderDropdownConnectItem('Connect Provider', URLS.LOCAL_HUB_BACKUPS),
			onClick: null,
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
				disabledStyle={offline}
				selectedIcon={renderProviderIcon(activeSiteProvider)}
				useClickInsteadOfHover={!offline}
			>
				{enabledProviders?.length && activeSiteProvider
					? activeSiteProvider.name
					: 'select provider'
				}
			</FlyDropdown>
		</div>
	);
};
