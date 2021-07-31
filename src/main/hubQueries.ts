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
	BackupSnapshotsResult,
} from '../types';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
/* @ts-ignore */
const { localHubClient } = getServiceContainer().cradle;

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

export async function getBackupSitesByRepoID (repoID: string): Promise<BackupSite> {
	const { data } = await localHubClient.query({
		query: gql`
			query getBackupSite ($repoID: String) {
				backupSites(uuid: $repoID) {
					id
					name
					uuid
					password
				}
			}
		`,
		variables: {
			repoID: repoID,
		},
	});

	return data?.backupSites;
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

export async function deleteBackupRepoRecord (queryArgs: { backupSiteID: number, backupRepoID: number; }) {
	const { backupSiteID, backupRepoID } = queryArgs;

	const { data } = await localHubClient.mutate({
		mutation: gql`
			mutation deleteBackupRepoRecord($backupSiteID: Int!, $backupRepoID: Int!) {
				deleteBackupRepoRecord(
					site_id: $backupSiteID,
					id: $backupRepoID,
				) {
					success
				}
			}
		`,
		variables: {
			backupSiteID,
			backupRepoID,
		},
	});

	return data?.deleteBackupRepoRecord.success;
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

export async function getBackupReposBySiteID (siteID: number): Promise<BackupRepo[]> {
	const { data } = await localHubClient.query({
		query: gql`
			query getBackupReposBySiteID($siteID: Int) {
  				backupRepos(site_id: $siteID) {
    				id
    				site_id
    				provider_id
    				hash
  				}
			}
		`,
		variables: {
			siteID: siteID,
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

export async function updateBackupSnapshot (queryArgs: { snapshotID: number, resticSnapshotHash?: string, status: SnapshotStatus, metaData?: SiteMetaData }): Promise<BackupSnapshot> {
	const { snapshotID, resticSnapshotHash, status, metaData } = queryArgs;

	const { data } = await localHubClient.mutate({
		mutation: gql`
			mutation updateBackupSnapshot($snapshotID: Int!, $resticSnapshotHash: String, $status: String!, $metaData: Mixed) {
				updateBackupSnapshot(id: $snapshotID, hash: $resticSnapshotHash, status: $status, config: $metaData) {
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
			metaData: JSON.stringify(metaData),
		},
	});

	const { repo_id: repoID, ...rest } = data?.updateBackupSnapshot;

	return { ...rest, repoID };
}

export async function deleteBackupSnapshotRecord (queryArgs: { snapshotID: number }) {
	const { snapshotID } = queryArgs;

	const { data } = await localHubClient.mutate({
		mutation: gql`
			mutation deleteBackupSnapshotRecord($snapshotID: Int!) {
				deleteBackupSnapshotRecord(id: $snapshotID) {
					success
				}
			}
		`,
		variables: {
			snapshotID,
		},
	});

	return data?.deleteBackupSnapshotRecord.success;
}

/**
 * @param repoId The backup restic repo id.
 * @param limit Limits number of fetched elements.
 * @param offset The offset from which elements are returned.
 */
export async function getBackupSnapshotsByRepo (repoId: number, limit: number, offset: number): Promise<BackupSnapshotsResult> {
	const { data } = await localHubClient.query({
		query: gql`
			query backupSnapshots($backup_repo_id: Int, $first: Int!, $page: Int!) {
				backupSnapshots(
					backup_repo_id: $backup_repo_id,
					first: $first,
					page: $page,
					orderBy: [{ field: "updated_at", order: DESC }]
				) {
					data {
						id
						repo_id
						hash
						updated_at
						created_at
						config
					}
					paginatorInfo {
						currentPage
						lastPage
					}
				}
			}
		`,
		variables: {
			// eslint-disable-next-line camelcase
			backup_repo_id: repoId,
			first: limit,
			page: offset,
		},
	});

	return {
		pagination: data?.backupSnapshots?.paginatorInfo,
		snapshots: data?.backupSnapshots?.data?.map(({ repo_id: repoID, updated_at: updatedAt, created_at: createdAt, ...rest }) => ({
			...rest,
			repoID,
			updatedAt,
			createdAt,
		})),
	};
}
