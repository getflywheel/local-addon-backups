import path from 'path';
import fs from 'fs-extra';
import * as LocalMain from '@getflywheel/local/main';
import { getServiceContainer } from '@getflywheel/local/main';
import { app } from 'electron';
import {
	getEnabledBackupProviders,
	getBackupReposByProviderID,
	getBackupSitesByRepoID,
	getBackupSnapshotsByRepo,
	getBackupCredentials,
} from '../hubQueries';
import { checkRepoExists, killActiveCommand, rekeyRepo, writeMetadataFile, RekeyStatus } from '../cli';
import { hubProviderToProvider } from '../utils';
import { MigrationStates } from '../../types';
import type {
	Site,
	HubProviderRecord,
	BackupRepo,
	BackupSnapshot,
	BackupSite,
	MigrationProgress,
	MigrationResult,
	BackupMetadata,
	GenericObject,
} from '../../types';
import { DEFAULT_BACKUP_PASSWORD, MIGRATION_STATE_FILE } from '../../constants';

const serviceContainer = getServiceContainer().cradle;
const {
	localLogger,
} = serviceContainer;

const logger = localLogger.child({
	thread: 'main',
	class: 'BackupAddonMigrationService',
});

let currentAbortController: AbortController | null = null;
let migrationInProgress = false;

export function isMigrationInProgress(): boolean {
	return migrationInProgress;
}

function isAbortError(err: unknown): boolean {
	const anyErr = err as any;
	return (
		anyErr?.name === 'AbortError' ||
		anyErr?.code === 'ABORT_ERR' ||
		String(anyErr?.message || '').toLowerCase().includes('aborted')
	);
}

function throwIfCancelled(signal?: AbortSignal) {
	if (signal?.aborted) {
		const e = new Error('Migration cancelled');
		(e as any).name = 'AbortError';
		throw e;
	}
}

export async function cancelMigration(): Promise<void> {
	if (!currentAbortController) {
		return;
	}

	logger.info('Cancelling migration (abort + kill active command)');

	try {
		currentAbortController.abort();
	} catch {
		// noop
	}

	// Best-effort kill of any in-flight restic/rclone command
	try {
		await killActiveCommand();
	} catch {
		// noop
	}
}

// Get package version for createdBy field
const packageJson = require('../../../package.json');
const CREATED_BY = `${packageJson.name}@${packageJson.version}`;

interface RepoWithMetadata {
	repo: BackupRepo;
	site: BackupSite;
	provider: HubProviderRecord;
	snapshots: BackupSnapshot[];
}

interface MigrationState {
	currentState: MigrationStates;
	totalRepos: number;
	processedRepos: number;
	totalSnapshots: number;
	processedSnapshots: number;
	errors: Array<{
		repo?: string;
		snapshot?: string;
		error: string;
	}>;
	migratedRepos: number;
	migratedSnapshots: number;
	skippedRepos: number;
	// For tracking fetching phase progress
	totalReposToFetch: number;
	fetchedRepos: number;
	currentProviderName?: string;
	currentRepoIndex?: number;
}

/**
 * Parse the CloudBackupsMetadata from the config string stored in Hub
 */
function parseConfig(configString: string): GenericObject {
	try {
		return JSON.parse(configString);
	} catch (err) {
		logger.warn(`Failed to parse config: ${err}`);
		return {};
	}
}

/**
 * Map HubOAuthProvider to BackupProvider format
 */
function mapProviderToBackupProvider(providerId: string): 'dropbox' | 'googleDrive' {
	if (providerId === 'google') {
		return 'googleDrive';
	}
	return 'dropbox';
}

/**
 * Human-readable provider display name
 */
function getProviderDisplayName(providerId: string): string {
	if (providerId === 'google') {
		return 'Google Drive';
	}
	return 'Dropbox';
}

/**
 * Build the BackupMetadata structure from Hub data
 */
function buildMetadata(
	snapshot: BackupSnapshot,
	site: BackupSite,
	repo: BackupRepo,
	provider: HubProviderRecord,
	accountId?: string,
): BackupMetadata {
	const config = parseConfig(snapshot.config || '{}');

	// Handle timestamp conversion safely
	let timestamp: string | undefined;
	if (snapshot.createdAt) {
		try {
			// createdAt might be a Unix timestamp (number) or already a Date/string
			const date = typeof snapshot.createdAt === 'number'
				? new Date(snapshot.createdAt * 1000)
				: new Date(snapshot.createdAt);

			// Check if date is valid
			if (!isNaN(date.getTime())) {
				timestamp = date.toISOString();
			}
		} catch (err) {
			logger.warn(`Failed to parse timestamp for snapshot ${snapshot.hash}: ${err}`);
		}
	}

	return {
		snapshotId: snapshot.hash,
		siteId: site.id.toString(),
		siteName: config.name || site.name || 'Unknown Site',
		siteDomain: config.domain,
		provider: mapProviderToBackupProvider(provider.id),
		services: config.services,
		accountId,
		resticRepoId: repo.hash,
		timestamp,
		hostname: config.hostname,
		note: config.description,
		paths: config.paths,
		createdBy: CREATED_BY,
	};
}

/**
 * Send progress update to renderer
 */
function sendProgressUpdate(state: MigrationState, customMessage?: string) {
	const progress: MigrationProgress = {
		state: state.currentState,
		message: customMessage || getStateMessage(state.currentState, state),
		progress: calculateProgress(state),
		totalRepos: state.totalRepos,
		processedRepos: state.processedRepos,
		totalSnapshots: state.totalSnapshots,
		processedSnapshots: state.processedSnapshots,
		errors: state.errors.map((e) => e.error),
	};

	LocalMain.sendIPCEvent('migration:progress', progress);
	logger.info(`Migration progress: ${Math.round(progress.progress * 100)}% - ${progress.message}`);
}

/**
 * Get human-readable message for current state
 */
function getStateMessage(state: MigrationStates, migrationState?: MigrationState): string {
	const hasRepoContext = !!(migrationState && migrationState.totalRepos > 0 && migrationState.currentProviderName);
	const repoIndex = migrationState?.currentRepoIndex || ((migrationState?.processedRepos || 0) + 1);
	const providerName = migrationState?.currentProviderName || '';
	const makeUnified = (step: string) => hasRepoContext
		? `Repo ${repoIndex} of ${migrationState!.totalRepos} • ${providerName} • ${step}`
		: step;

	switch (state) {
		case MigrationStates.fetchingProviders:
			return 'Fetching cloud providers...';
		case MigrationStates.fetchingRepos:
			return 'Fetching backup repositories...';
		case MigrationStates.processingRepo:
			return makeUnified('Processing repository');
		case MigrationStates.writingMetadata:
			return makeUnified('Writing metadata');
		case MigrationStates.rekeyingRepo:
			return makeUnified('Rekeying repository');
		case MigrationStates.savingState:
			return 'Saving migration state...';
		case MigrationStates.cancelled:
			return 'Migration cancelled';
		case MigrationStates.finished:
			return 'Migration completed!';
		case MigrationStates.failed:
			return 'Migration failed';
		default:
			return 'Processing...';
	}
}

/**
 * Calculate overall progress percentage
 * Progress is split into phases:
 * - 20% for fetching data from Local Hub
 * - 80% for processing (writing metadata + rekeying)
 */
function calculateProgress(state: MigrationState): number {
	// Phase 1: Fetching data from Local Hub (0-20%)
	if (state.totalRepos === 0) {
		// Still in the fetching phase
		if (state.totalReposToFetch === 0) {
			return 0;
		}
		const fetchProgress = state.fetchedRepos / state.totalReposToFetch;
		return Math.min(fetchProgress * 0.2, 0.2); // Fetching is 20% of total progress
	}

	// Phase 2: Processing repos and snapshots (20-100%)
	if (state.totalSnapshots === 0) {
		return 0.2; // Fetching complete, processing about to start
	}

	// 60% weight for processing repos (20% + 60% = 80% total)
	const repoProgress = (state.processedRepos / state.totalRepos) * 0.6;

	// 20% weight for processing snapshots (80% + 20% = 100% total)
	const snapshotProgress = (state.processedSnapshots / state.totalSnapshots) * 0.2;

	return Math.min(0.2 + repoProgress + snapshotProgress, 1);
}

/**
 * Create a dummy site object for CLI operations
 * We need this because CLI functions require a Site object
 */
function createDummySite(repoId: string): Site {
	// Use a temporary directory for the site path
	const tmpDir = path.join(require('os').tmpdir(), 'migration-tmp');
	fs.ensureDirSync(tmpDir);

	return {
		id: `migration-${repoId}`,
		name: 'Migration Temp Site',
		path: tmpDir,
		domain: 'migration.local',
		services: {},
	} as Site;
}

/**
 * Main migration function
 */
export async function migrateBackups(): Promise<MigrationResult> {
	if (migrationInProgress) {
		throw new Error('Migration is already running');
	}

	migrationInProgress = true;
	currentAbortController = new AbortController();
	const signal = currentAbortController.signal;

	const state: MigrationState = {
		currentState: MigrationStates.fetchingProviders,
		totalRepos: 0,
		processedRepos: 0,
		totalSnapshots: 0,
		processedSnapshots: 0,
		errors: [],
		migratedRepos: 0,
		migratedSnapshots: 0,
		skippedRepos: 0,
		totalReposToFetch: 0,
		fetchedRepos: 0,
	};

	try {
		// Step 1: Fetch all providers
		throwIfCancelled(signal);
		state.currentState = MigrationStates.fetchingProviders;
		sendProgressUpdate(state);
		logger.info('Fetching enabled providers...');

		const providers = await getEnabledBackupProviders();
		if (!providers || providers.length === 0) {
			throw new Error('No enabled providers found');
		}
		logger.info(`Found ${providers.length} providers`);

		// Step 2: Fetch all repos for all providers
		throwIfCancelled(signal);
		state.currentState = MigrationStates.fetchingRepos;
		sendProgressUpdate(state);
		logger.info('Fetching repositories...');

		const allRepos: RepoWithMetadata[] = [];
		// First pass: determine total number of repos across all providers to stabilize fetch-phase progress
		const providerReposList: Array<{ provider: HubProviderRecord, repos: BackupRepo[] }> = [];
		let totalReposToFetch = 0;

		// First determine stable total
		for (const provider of providers) {
			throwIfCancelled(signal);
			try {
				const repos = await getBackupReposByProviderID(provider.id);
				logger.info(`Found ${repos.length} repos for provider ${provider.id}`);
				totalReposToFetch += repos.length;
				providerReposList.push({ provider, repos });
			} catch (err) {
				logger.error(`Failed to fetch repos for provider ${provider.id}: ${err}`);
				state.errors.push({
					error: `Failed to fetch repos for ${provider.id}: ${err.message}`,
				});
				// Push empty list for provider to continue processing others
				providerReposList.push({ provider, repos: [] });
			}
		}
		// Set the stabilized denominator before any per-repo fetch updates
		state.totalReposToFetch = totalReposToFetch;
		sendProgressUpdate(state);

		// Now perform detailed fetch for each repo and update progress monotonically
		for (const { provider, repos } of providerReposList) {
			throwIfCancelled(signal);
			const providerName = getProviderDisplayName(provider.id);
			for (let i = 0; i < repos.length; i++) {
				throwIfCancelled(signal);
				const repo = repos[i];
				// Use a single "Processing repository" state for fetching site, snapshots, and checking existence
				state.currentState = MigrationStates.processingRepo;
				// Show which repo we're fetching data for
				sendProgressUpdate(state, `Fetching backup data for ${providerName}...`);

				try {
					// Fetch site info
					const sites = await getBackupSitesByRepoID(repo.hash);
					if (!sites) {
						logger.warn(`No sites found for repo ${repo.hash}`);
						// Increment fetched repos counter for progress tracking even if missing
						state.fetchedRepos++;
						sendProgressUpdate(state, `Fetching backup data for ${providerName}...`);
						continue;
					}

					// getBackupSitesByRepoID can return a single site object or an array
					const site = Array.isArray(sites) ? sites[0] : sites;
					if (!site) {
						logger.warn(`No valid site found for repo ${repo.hash}`);
						state.fetchedRepos++;
						sendProgressUpdate(state, `Fetching backup data for ${providerName}...`);
						continue;
					}

					// Fetch all snapshots for this repo (with pagination)
					const allSnapshots: BackupSnapshot[] = [];
					let currentPage = 1;
					let hasMore = true;

					while (hasMore) {
						throwIfCancelled(signal);
						const result = await getBackupSnapshotsByRepo(repo.id, 50, currentPage);
						if (result.snapshots && result.snapshots.length > 0) {
							allSnapshots.push(...result.snapshots);
							// Show snapshot count as we fetch
							sendProgressUpdate(state, `Fetching backup data for ${providerName} (${allSnapshots.length} snapshots found)...`);
						}
						hasMore = result.pagination.currentPage < result.pagination.lastPage;
						currentPage++;
					}

					logger.info(`Found ${allSnapshots.length} snapshots for repo ${repo.hash}`);

					if (allSnapshots.length > 0) {
						allRepos.push({
							repo,
							site,
							provider,
							snapshots: allSnapshots,
						});
						state.totalSnapshots += allSnapshots.length;
					}

					// Increment fetched repos counter for progress tracking
					state.fetchedRepos++;
					sendProgressUpdate(state, `Fetching backup data for ${providerName}...`);
				} catch (err) {
					logger.error(`Failed to fetch data for repo ${repo.hash}: ${err}`);
					state.errors.push({
						repo: repo.hash,
						error: `Failed to fetch repo data: ${err.message}`,
					});
					// Still increment fetched repos counter even on error
					state.fetchedRepos++;
					sendProgressUpdate(state, `Fetching backup data for ${providerName}...`);
				}
			}
		}

		state.totalRepos = allRepos.length;
		logger.info(`Total repos to migrate: ${state.totalRepos}, Total snapshots: ${state.totalSnapshots}`);

		// Step 5: Process each repo (write metadata and rekey)
		for (const repoData of allRepos) {
			throwIfCancelled(signal);
			const { repo, site, provider, snapshots } = repoData;
			logger.info(`Processing repo ${repo.hash} with ${snapshots.length} snapshots`);

			try {
				// Create a dummy site for CLI operations
				const dummySite = createDummySite(repo.hash);
				const rcloneProvider = hubProviderToProvider(provider.id);
				const providerName = getProviderDisplayName(provider.id);
				const currentRepoNumber = state.processedRepos + 1;
				state.currentProviderName = providerName;
				state.currentRepoIndex = currentRepoNumber;

				// Check if repo exists before attempting to write metadata
				const exists = await checkRepoExists({
					provider: rcloneProvider,
					encryptionPassword: site.password,
					localBackupRepoID: repo.hash,
					site: dummySite,
					signal,
				});

				if (!exists) {
					logger.warn(`Repo ${repo.hash} does not exist on ${provider.id}, skipping`);
					state.skippedRepos++;
					state.processedRepos++;
					state.processedSnapshots += snapshots.length;
					state.errors.push({
						repo: repo.hash,
						error: 'Repository not found on remote provider',
					});
					sendProgressUpdate(state, `Repo ${currentRepoNumber} of ${state.totalRepos} • ${providerName} • Skipped (not found)`);
					continue;
				}

				// Get account ID from credentials
				let accountId: string | undefined;
				try {
					const credentials = await getBackupCredentials(provider.id);
					// Try to extract account ID from token or other fields
					if (credentials.token) {
						try {
							const tokenData = JSON.parse(credentials.token);
							accountId = tokenData.account_id || tokenData.id;
						} catch {
							// Token might not be JSON, that's okay
						}
					}
				} catch (err) {
					logger.warn(`Could not get account ID for ${provider.id}: ${err}`);
				}

				// Write metadata for each snapshot
				state.currentState = MigrationStates.writingMetadata;
				sendProgressUpdate(state, `Repo ${currentRepoNumber} of ${state.totalRepos} • ${providerName} • Writing metadata`);

				for (const snapshot of snapshots) {
					throwIfCancelled(signal);
					try {
						const metadata = buildMetadata(snapshot, site, repo, provider, accountId);
						const metadataJson = JSON.stringify(metadata, null, 2);

						await writeMetadataFile({
							provider: rcloneProvider,
							localBackupRepoID: repo.hash,
							snapshotHash: snapshot.hash,
							metadata: metadataJson,
							site: dummySite,
							signal,
						});

						state.processedSnapshots++;
						state.migratedSnapshots++;
						sendProgressUpdate(state, `Repo ${currentRepoNumber} of ${state.totalRepos} • ${providerName} • Writing metadata`);
						logger.info(`Wrote metadata for snapshot ${snapshot.hash}`);
					} catch (err) {
						logger.error(`Failed to write metadata for snapshot ${snapshot.hash}: ${err}`);
						state.errors.push({
							repo: repo.hash,
							snapshot: snapshot.hash,
							error: `Failed to write metadata: ${err.message}`,
						});
						state.processedSnapshots++;
						sendProgressUpdate(state, `Repo ${currentRepoNumber} of ${state.totalRepos} • ${providerName} • Writing metadata`);
					}
				}

				// Rekey the repo
				state.currentState = MigrationStates.rekeyingRepo;
				sendProgressUpdate(state, `Repo ${currentRepoNumber} of ${state.totalRepos} • ${providerName} • Rekeying repository`);

				try {
					throwIfCancelled(signal);
					const rekeyStatus = await rekeyRepo({
						provider: rcloneProvider,
						oldPassword: site.password,
						newPassword: DEFAULT_BACKUP_PASSWORD,
						localBackupRepoID: repo.hash,
						site: dummySite,
						signal,
					});
					if (rekeyStatus === RekeyStatus.RepoNotFound) {
						logger.warn(`Repo ${repo.hash} not found during rekey; skipping`);
						state.skippedRepos++;
						state.processedRepos++;
						state.errors.push({
							repo: repo.hash,
							error: 'Repository not found on remote provider',
						});
						sendProgressUpdate(state, `Repo ${currentRepoNumber} of ${state.totalRepos} • ${providerName} • Skipped (not found)`);
						continue;
					}
					logger.info(`Rekeyed repo ${repo.hash}`);
				} catch (err) {
					throw new Error(`Failed to rekey repo ${repo.hash}: ${err.message}`);
				}

				state.migratedRepos++;
				state.processedRepos++;
				sendProgressUpdate(state, `Repo ${currentRepoNumber} of ${state.totalRepos} • ${providerName} • Completed`);

			} catch (err) {
				logger.error(`Failed to process repo ${repo.hash}: ${err}`);
				state.errors.push({
					repo: repo.hash,
					error: err.message,
				});
				state.processedRepos++;
				sendProgressUpdate(state, `Repo ${state.processedRepos} of ${state.totalRepos} • ${state.currentProviderName || 'Cloud Provider'} • Error`);

				// If rekeying failed, this is critical - stop migration
				if (err.message.includes('Failed to rekey')) {
					throw err;
				}
			}
		}

		// Step 10: Save migration state
		throwIfCancelled(signal);
		state.currentState = MigrationStates.savingState;
		sendProgressUpdate(state);

		await saveMigrationState();

		// Step 11: Complete
		state.currentState = MigrationStates.finished;
		sendProgressUpdate(state);

		const result: MigrationResult = {
			success: true,
			migratedRepos: state.migratedRepos,
			migratedSnapshots: state.migratedSnapshots,
			skippedRepos: state.skippedRepos,
			errors: state.errors,
		};

		logger.info('Migration completed successfully', result);
		LocalMain.sendIPCEvent('migration:complete', result);

		return result;

	} catch (err) {
		if (isAbortError(err)) {
			// Cancelled: do not save completion state
			await killActiveCommand();

			state.currentState = MigrationStates.cancelled;
			sendProgressUpdate(state);
			const result: MigrationResult = {
				success: false,
				migratedRepos: state.migratedRepos,
				migratedSnapshots: state.migratedSnapshots,
				skippedRepos: state.skippedRepos,
				errors: state.errors,
				cancelled: true,
			};
			LocalMain.sendIPCEvent('migration:cancelled', result);
			return result;
		}

		logger.error('Migration failed', err);
		state.currentState = MigrationStates.failed;
		sendProgressUpdate(state);

		const result: MigrationResult = {
			success: false,
			migratedRepos: state.migratedRepos,
			migratedSnapshots: state.migratedSnapshots,
			skippedRepos: state.skippedRepos,
			errors: [
				...state.errors,
				{
					error: err.message,
				},
			],
		};

		LocalMain.sendIPCEvent('migration:error', result);
		throw err;
	} finally {
		migrationInProgress = false;
		currentAbortController = null;
	}
}

/**
 * Save migration completion state to user data folder
 */
async function saveMigrationState(): Promise<void> {
	try {
		const userDataPath = app?.getPath('userData');

		const stateFilePath = path.join(userDataPath, MIGRATION_STATE_FILE);
		await fs.writeJson(stateFilePath, { migrated: true });
		logger.info(`Saved migration state to ${stateFilePath}`);
	} catch (err) {
		logger.error(`Failed to save migration state: ${err}`);
		throw err;
	}
}

/**
 * Check if migration has already been completed
 */
export async function hasMigrationCompleted(): Promise<boolean> {
	try {
		const userDataPath = app?.getPath('userData');

		const stateFilePath = path.join(userDataPath, MIGRATION_STATE_FILE);
		if (await fs.pathExists(stateFilePath)) {
			const state = await fs.readJson(stateFilePath);
			return state.migrated === true;
		}
		return false;
	} catch (err) {
		logger.error(`Failed to check migration state: ${err}`);
		return false;
	}
}

