import gql from 'graphql-tag';
import type { Site } from '@getflywheel/local';
import { getServiceContainer } from '@getflywheel/local/main';
import type { Providers, RcloneConfig, BackupSite } from '../types';

/* @ts-ignore */
const { localHubAPI } = getServiceContainer().cradle;

export async function getBackupCredentials (provider: Providers): Promise<RcloneConfig> {
	const { data } = await localHubAPI.client.mutate({
		mutation: gql`
			mutation getBackupCredentials($providerID: String!) {
			  getBackupCredentials(provider_id: $providerID) {
			    config
			  }
			}
		`,
		variables: {
			providerID: provider,
		},
	});

	return {
		...data?.getBackupCredentials?.config,
		clientID: data?.getBackupCredentials.config.client_id,
	};
}


export async function getBackupSite (localBackupRepoID: string): Promise<BackupSite> {
	const { data } = await localHubAPI.client.query({
		query: gql`
			query getBackupSite ($repoID: String) {
				backupSites(uuid: $repoID) {
					uuid
					password
				}
			}
		`,
		variables: {
			repoID: localBackupRepoID,
		},
	});

	return data?.backupSites?.[0];
}

export async function createBackupSite (site: Site): Promise<BackupSite> {
	const { data } = await localHubAPI.client.mutate({
		mutation: gql`
			mutation createBackupSite($siteName: String!, $siteUrl: String!) {
				createBackupSite(name: $siteName, url: $siteUrl) {
					uuid
					password
			  }
			}
		`,
		variables: {
			siteName: site.name,
			siteUrl: site.url,
		},
	});

	return data?.createBackupSite;
}
