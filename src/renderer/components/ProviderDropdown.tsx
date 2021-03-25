import React from 'react';
import {
	FlyDropdown,
	TextButton,
} from '@getflywheel/local-components';
import styles from './ProviderDropdown.scss';
import LoginIconExternalLinkSvg from '../assets/external-link.svg';
import GoogleDriveIcon from '../assets/google-drive.svg';
import DropboxIcon from '../assets/dropbox.svg';
import type { HubProviderRecord } from '../../types';
import { HubOAuthProviders } from '../../types';

interface Props {
	enabledProviders: HubProviderRecord[];
	onClickItem: () => void;
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
}

const renderDropdownItem = (onClickItem: Props['onClickItem'], provider?: HubProviderRecord, externalLabel?: string) => (
	<>
		<TextButton
			className={styles.ProviderDropdown_Item_TextButton}
			onClick={onClickItem}
			privateOptions={{
				fontWeight: 'medium',
				textTransform: 'none',
			}}
		>
			<>
				<span className={styles.ProviderDropdown_Item_TextButton_Label}>
					{provider?.name ?? externalLabel ?? 'Connect Provider'}
				</span>
				{/* todo - crum: wireup to selected provider (is this persisted somewhere?) */}
				<span className={styles.ProviderDropdown_Item_TextButton_Value}>
					{provider
						? (
							<>
								✔
							</>
						)
						: (
							<LoginIconExternalLinkSvg className={styles.TextButtonExternal_Svg} />
						)
					}
				</span>
			</>
		</TextButton>
	</>
);

export const ProviderDropdown = ({
	enabledProviders,
	onClickItem,
}: Props) => {
	const dropdownItems: React.ComponentProps<typeof FlyDropdown>['items'] = [];

	if (enabledProviders.length) {
		enabledProviders.forEach((provider) => {
			dropdownItems.push({
				color: 'none',
				content: renderDropdownItem(onClickItem, provider),
				onClick: () => console.log('onClick')
			});
		});

		dropdownItems.push({
			color: 'none',
			content: renderDropdownItem(onClickItem, undefined, 'Add or Manage Provider'),
			onClick: () => console.log('onClick')
		});
	}
	else {
		dropdownItems.push({
			color: 'none',
			content: renderDropdownItem(onClickItem),
			onClick: () => console.log('onClick')
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
				{enabledProviders.length
					? (
						// todo - crum: wireup to selected provider (is this persisted somewhere?)
						<>
							{renderProviderIcon(enabledProviders[0])}
							{enabledProviders[0].name}
						</>
					)
					: "no provider"
				}
			</FlyDropdown>
		</div>
	);
}
