import gql from 'graphql-tag';
import type { Site } from '@getflywheel/local';
import { getServiceContainer } from '@getflywheel/local/main';
import type { Providers, RcloneConfig, BackupSite, BackupRepo } from '../types';

/* @ts-ignore */
const { localHubClient } = getServiceContainer().cradle;

export async function getBackupCredentials (provider: Providers): Promise<RcloneConfig> {
	const { data } = await localHubClient.mutate({
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
	const { data } = await localHubClient.query({
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
	const { data } = await localHubClient.mutate({
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

export async function createBackupRepo (site: Site, provider: Providers): Promise<BackupRepo> {
	const { data } = await localHubClient.mutation({
		mutation: gql`
			mutation createBackupRepo(
				$siteID: Int!,
				$providerID: String!,
				$repoID: String!
			) {
				createBackupRepo(
					site_id: $siteID,
					provider_id: $providerID,
					hash: $repoID
				) {
					id
					site_id
					provider_id
					hash
				}
	  		}
		`,
		variables: {
			siteID: site.id,
			providerID: provider,
			/* @ts-ignore */
			repoID: site.localBackupRepoID,
		},
	});

	return {
		...data?.createBackupRepo,
		providerID: data?.createBackupRepo?.provider_id,
		siteID: data?.createBackupRepo?.site_id,
	};
}

export async function getBackupReposByProviderID (provider: Providers): Promise<BackupRepo[]> {
	const { data } = await localHubClient.query({
		query: gql`
			query getBackupReposByProviderID($providerID: String) {
  				backupRepos(provider_id: $providerID) {
    				id
    				site_id
    				provider_id
    				hash
  				}
			}
		`,
		variables: {
			providerID: provider,
		},
	});

	return {
		...data?.backupRepos,
		providerID: data?.backupRepos?.provider_id,
		siteID: data?.backupRepos?.site_id,
	};
}
