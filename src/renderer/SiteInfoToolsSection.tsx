import React, { useEffect, useState } from 'react';
import { EmptyArea, Text, Divider, Button, TextButton } from '@getflywheel/local-components';
import { ipcAsync } from '@getflywheel/local/renderer';
import type { Site } from '@getflywheel/local';
import { URLS } from '../constants';
import type { HubProviderRecord } from '../types';
import { HubOAuthProviders, Providers } from '../types';

/* @ts-ignore */
import GoogleDriveIcon from './assets/google-drive.svg';
import DropboxIcon from './assets/dropbox.svg';
/* @ts-ignore */
import styles from './SiteInfoToolsSection.scss';

interface Props {
	site: Site;
}

const getProviderIcon = (provider: HubOAuthProviders) => {
	if (provider === 'google') {
		return GoogleDriveIcon;
	}

	if (provider === 'dropbox') {
		return DropboxIcon;
	}

	return null;
};

const addDivider = (items) => items.reduce((acc, item, i) => {
	acc.push(item);

	if (i !== items.length - 1) {
		acc.push(<Divider className={styles.SiteInfoToolsSection_ProviderDivider}/>);
	}

	return acc;
}, []);

const convertHubProviderToRsyncProviderName = (hubProvider: HubOAuthProviders) => {
	if (hubProvider === HubOAuthProviders.Google) {
		return Providers.Drive;
	}

	if (hubProvider === HubOAuthProviders.Dropbox) {
		return Providers.Dropbox;
	}

	return null;
};

const launchBrowser = (url: string) => ipcAsync(
	'browserService:launch',
	url,
);

const backupSite = (site: Site, provider: Providers) => ipcAsync(
	'backups:backup-site',
	site.id,
	provider,
);

const SiteInfoToolsSection = (props: Props) => {
	const { site } = props;

	const [loadingProviders, setLoadingProviders] = useState(false);
	const [enabledProviders, setEnabledProviders] = useState<HubProviderRecord[]>([]);

	useEffect(() => {
	    (async () => {
			setLoadingProviders(true);
	        setEnabledProviders(await ipcAsync('enabled-providers'));
			setLoadingProviders(false);
	    })();
	}, []);

	/**
	 * @todo sometimes the query to hub fails (like if the auth token has expired)
	 * we should handle that more gracefully
	 */
	if (loadingProviders) {
		return (
			<span>loading...</span>
		);
	}

	return (
		<div className={styles.SiteInfoToolsSection}>
			<div className={styles.SiteInfoToolsSection_Header}>
				{/* <GoogleDriveIcon /> */}
				<Text>
					Latest backup: N/A
				</Text>
				<TextButton onClick={() => launchBrowser(`${URLS.LOCAL_HUB}/addons/backups`)}>
					Manage Connections
				</TextButton>
			</div>
			<Divider />
			{addDivider(enabledProviders.map(({ id, name }) => {
				const Icon = getProviderIcon(id);

				return (
					<>
						<div className={styles.SiteInfoToolsSection_ProviderHeader}>
							<Icon />
							<Text privateOptions={{ fontSize: 'm', fontWeight: 'bold' }}>{name}</Text>
							<Button
								onClick={() => backupSite(site, convertHubProviderToRsyncProviderName(id))}
							>
								Backup Site
							</Button>
						</div>
						<EmptyArea className={styles.SiteInfoToolsSection_EmptyArea}>
							<Text>No backups created yet</Text>
						</EmptyArea>
					</>
				);
			}))}
		</div>
	);
};

export default SiteInfoToolsSection;
