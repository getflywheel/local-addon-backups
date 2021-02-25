import gql from 'graphql-tag';
import { getServiceContainer } from '@getflywheel/local/main';
import type {
	HubOAuthProviders,
	RcloneConfig,
	BackupSite,
	BackupRepo,
	Site,
	HubProviderRecord,
} from '../types';

/* @ts-ignore */
const { localHubClient } = getServiceContainer().cradle;

/**
 * @todo add handling (logging + UI) in case the Hub user has been logged out
 */


export async function getBackupCredentials (provider: HubOAuthProviders): Promise<RcloneConfig> {
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
		clientID: data?.getBackupCredentials?.config?.client_id,
		appKey: data?.getBackupCredentials?.config?.app_key,
	};
}


export async function getBackupSite (localBackupRepoID: string): Promise<BackupSite> {
	const { data } = await localHubClient.query({
		query: gql`
			query getBackupSite ($repoID: String) {
				backupSites(uuid: $repoID) {
					id
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
					id
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

export async function createBackupRepo (id: number, localBackupRepoID: string, provider: HubOAuthProviders): Promise<BackupRepo> {
	const { data } = await localHubClient.mutate({
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
			repoID: localBackupRepoID,
			siteID: id,
			providerID: provider,
		},
	});

	return {
		...data?.createBackupRepo,
		providerID: data?.createBackupRepo?.provider_id,
		siteID: data?.createBackupRepo?.site_id,
	};
}

export async function getBackupReposByProviderID (provider: HubOAuthProviders): Promise<BackupRepo[]> {
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

	return [
		...data?.backupRepos,
	].map((backupRepo) => ({
		...backupRepo,
		providerID: backupRepo.provider_id,
		siteID: backupRepo.site_id,
	}));
}

export async function getBackupRepo (id: number, provider: HubOAuthProviders): Promise<BackupRepo[]> {
	const { data } = await localHubClient.query({
		query: gql`
			query getBackupRepos($siteID: Int, $providerID: String) {
  				backupRepos(site_id: $siteID, provider_id: $providerID) {
    				id
    				site_id
    				provider_id
    				hash
  				}
			}
		`,
		variables: {
			siteID: id,
			providerID: provider,
		},
	});

	return [
		...data?.backupRepos,
	].map((backupRepo) => ({
		...backupRepo,
		providerID: backupRepo.provider_id,
		siteID: backupRepo.site_id,
	}))[0];
}

export async function getEnabledBackupProviders (): Promise<HubProviderRecord[]> {
	const { data } = await localHubClient.query({
		query: gql`
			query backupProviders {
				backupProviders {
					id
					name
				}
			}	
		`,
	});

	return data?.backupProviders;
}

export async function createBackupSnapshot (repoID: number) {
	const { data } = await localHubClient.mutate({
		mutation: gql`
			mutation createBackupSnapshot($repoID: Int!) {
				createBackupSnapshot(repo_id: $repoID) {
					id
					repo_id
					hash
				}
			}
		`,
		variables: {
			repoID,
		},
	});

	// eslint-disable-next-line camelcase
	const { repo_id, ...rest } = data?.updateBackupSnapshot;
	// eslint-disable-next-line camelcase
	return { ...rest, repoID: repo_id };
}

export async function updateBackupSnapshot (queryArgs: { snapshotID: number, resticSnapshotHash: string, duration: number }): Promise<{}> {
	const { snapshotID, resticSnapshotHash, duration } = queryArgs;

	const { data } = await localHubClient.mutate({
		mutation: gql`
			mutation updateBackupSnapshot($snapshotID: Int!, $resticSnapshotHash: String!, $duration: Int!) {
				updateBackupSnapshot(id: $snapshotID, hash: $resticSnapshotHash, duration: $duration) {
					id
					repo_id
					hash
					duration
				}
			}	
		`,
		variables: {
			snapshotID,
			resticSnapshotHash,
			duration,
		},
	});

	const { repo_id: repoID, ...rest } = data?.updateBackupSnapshot;
	return { ...rest, repoID };
}
