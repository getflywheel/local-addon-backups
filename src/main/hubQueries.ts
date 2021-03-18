import gql from 'graphql-tag';
import { getServiceContainer } from '@getflywheel/local/main';
import type {
	HubOAuthProviders,
	RcloneConfig,
	BackupSite,
	BackupRepo,
	BackupSnapshot,
	Site,
	HubProviderRecord,
	SiteMetaData,
	SnapshotStatus,
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

export async function createBackupRepo (queryArgs: { backupSiteID: number; localBackupRepoID: string; provider: HubOAuthProviders; }): Promise<BackupRepo> {
	const { backupSiteID, localBackupRepoID, provider } = queryArgs;
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
			siteID: backupSiteID,
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

export async function createBackupSnapshot (repoID: number, metaData: SiteMetaData): Promise<BackupSnapshot> {
	const { data } = await localHubClient.mutate({
		mutation: gql`
			mutation createBackupSnapshot($repoID: Int!, $metaData: Mixed) {
				createBackupSnapshot(repo_id: $repoID, config: $metaData) {
					id
					repo_id
					hash
				}
			}
		`,
		variables: {
			repoID,
			metaData: JSON.stringify(metaData),
		},
	});

	// eslint-disable-next-line camelcase
	const { repo_id, ...rest } = data?.createBackupSnapshot;
	// eslint-disable-next-line camelcase
	return { ...rest, repoID: repo_id };
}

export async function updateBackupSnapshot (queryArgs: { snapshotID: number, resticSnapshotHash?: string, status: SnapshotStatus }): Promise<BackupSnapshot> {
	const { snapshotID, resticSnapshotHash, status } = queryArgs;

	const { data } = await localHubClient.mutate({
		mutation: gql`
			mutation updateBackupSnapshot($snapshotID: Int!, $resticSnapshotHash: String, $status: String!) {
				updateBackupSnapshot(id: $snapshotID, hash: $resticSnapshotHash, status: $status) {
					id
					repo_id
					hash
				}
			}	
		`,
		variables: {
			snapshotID,
			resticSnapshotHash,
			status,
		},
	});

	const { repo_id: repoID, ...rest } = data?.updateBackupSnapshot;
	return { ...rest, repoID };
}

export async function getBackupSnapshot (snapshotID: number) {
	const { data } = await localHubClient.query({
		query: gql`
			query backupSnapshots($snapshotID: Int) {
				backupSnapshots(id: $snapshotID) {
					id
					repo_id
					hash
				}
			}	
		`,
		variables: { snapshotID },
	});

	const { repo_id: repoID, ...rest } = data?.backupSnapshots?.[0];
	return { ...rest, repoID };
}

/**
 * Filtering the query by repo_id appears to be broken atm. Saving this until we fix that up on the Hub side
 */
// export async function getBackupSnapshots (repoID: number): Promise<BackupSnapshot[]> {
// 	const { data } = await localHubClient.query({
// 		query: gql`
// 			query backupSnapshots($repoID: Int) {
// 				backupSnapshots(repo_id: $repoID) {
// 					id
// 					repo_id
// 					hash
// 					updated_at
// 				}
// 			}
// 		`,
// 		variables: { repoID },
// 	});
//
// 	const s = data?.backupSnapshots?.map(({ repo_id: repoID, updated_at: updatedAt, ...rest }) => ({
// 		...rest,
// 		repoID,
// 		updatedAt,
// 	}));
//
// 	return s;
// }

export async function getBackupSnapshots (): Promise<BackupSnapshot[]> {
	const { data } = await localHubClient.query({
		query: gql`
			query backupSnapshots {
				backupSnapshots {
					id
					repo_id
					hash
					updated_at
				}
			}
		`,
	});

	return data?.backupSnapshots?.map(({ repo_id: repoID, updated_at: updatedAt, ...rest }) => ({
		...rest,
		repoID,
		updatedAt,
	}));
}
