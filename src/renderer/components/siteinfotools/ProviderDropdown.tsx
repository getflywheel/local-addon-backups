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
import {
	actions,
	selectors,
	store,
	useStoreSelector,
} from '../../store/store';
import classnames from 'classnames';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';

const renderProviderIcon = (provider: HubProviderRecord): React.ReactNode => {
	switch (provider.id) {
		case HubOAuthProviders.Dropbox:
			return <DropboxIcon className={styles.ProviderDropdown_Content_ProviderSvg} />;
		case HubOAuthProviders.Google:
			return <GoogleDriveIcon className={styles.ProviderDropdown_Content_ProviderSvg} />;
		default:
			return null;
	}
}

const renderTextButton = (label: React.ReactNode, value: React.ReactNode, deactivateLabel?: boolean) => (
	<TextButton
		className={classnames(
			styles.ProviderDropdown_Item_TextButton,
			{
				[styles.ProviderDropdown_Item_TextButton__Deactivated]: deactivateLabel,
			}
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
	<LoginIconExternalLinkSvg className={styles.TextButtonExternal_Svg} />
)

const renderDropdownProviderItem = (provider?: HubProviderRecord, isActiveProvider?: boolean, ) => renderTextButton(
	provider?.name,
	provider && isActiveProvider
		? (
			<CheckmarkIcon className={styles.ProviderDropdown_Item_TextButton_CheckmarkSvg} />
		)
		: 'Select',
	isActiveProvider,
);

export const ProviderDropdown = () => {
	const { enabledProviders } = useStoreSelector((state) => state.providers);
	const activeSiteProvider = useStoreSelector(selectors.activeSiteProvider)
	const dropdownItems: React.ComponentProps<typeof FlyDropdown>['items'] = [];

	if (enabledProviders.length) {
		enabledProviders.forEach((provider) => {
			dropdownItems.push({
				color: 'none',
				content: renderDropdownProviderItem(provider, activeSiteProvider === provider),
				onClick: () => store.dispatch(actions.setActiveProviderAndPersist(provider.id)),
			});
		});

		dropdownItems.push({
			color: 'none',
			content: renderDropdownConnectItem('Add or Manage Provider'),
			onClick: launchBrowserToHubBackups,
		});
	}
	else {
		dropdownItems.push({
			color: 'none',
			content: renderDropdownConnectItem(),
			onClick: launchBrowserToHubBackups,
		});
	}

	return (
		<div className={styles.ProviderDropdown_Cont}>
			<span className={styles.ProviderDropdown_Label}>
				Back up to
			</span>
			<FlyDropdown
				className={styles.ProviderDropdown}
				position="bottom"
				items={dropdownItems}
			>
				{enabledProviders.length && activeSiteProvider
					? (
						<>
							{renderProviderIcon(activeSiteProvider)}
							{activeSiteProvider.name}
						</>
					)
					: "no provider"
				}
			</FlyDropdown>
		</div>
	);
}
