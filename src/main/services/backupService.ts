import path from 'path';
import fs from 'fs-extra';
import { Machine, interpret, assign, DoneInvokeEvent } from 'xstate';
import { getServiceContainer, formatHomePath } from '@getflywheel/local/main';
import { getSiteDataFromDisk, providerToHubProvider, updateSite, camelCaseToSentence } from '../utils';
import {
	getBackupSite,
	createBackupSite,
	getBackupReposByProviderID,
	createBackupRepo,
	createBackupSnapshot,
	updateBackupSnapshot,
	deleteBackupRepoRecord,
	deleteBackupSnapshotRecord,
} from '../hubQueries';
import { initRepo, createSnapshot as createProviderSnapshot } from '../cli';
import type { Site, Providers, GenericObject, SiteMetaData, BackupSnapshot } from '../../types';
import { metaDataFileName, backupSQLDumpFile } from '../../constants';
import { BackupStates } from '../../types';
import serviceState from './state';

const serviceContainer = getServiceContainer().cradle;
const {
	localLogger,
	siteDatabase,
	sendIPCEvent,
	siteProcessManager,
} = serviceContainer;

const logger = localLogger.child({
	thread: 'main',
	class: 'BackupAddonBackupService',
});

interface BackupMachineContext {
	site: Site;
	initialSiteStatus: string;
	provider: Providers;
	description: string;
	encryptionPassword?: string;
	backupSiteID?: number;
	backupRepoID?: number;
	snapshot?: BackupSnapshot;
	localBackupRepoID?: string;
	error?: string;
}

interface ErrorState {
	message: string;
	type: string;
}

interface BackupMachineSchema {
	states: {
		[BackupStates.creatingDatabaseSnapshot]: GenericObject;
		[BackupStates.creatingBackupSite]: GenericObject;
		[BackupStates.creatingBackupRepo]: GenericObject;
		[BackupStates.initingResticRepo]: GenericObject;
		[BackupStates.creatingHubSnapshot]: GenericObject;
		[BackupStates.creatingResticSnapshot]: GenericObject;
		[BackupStates.finished]: GenericObject;
		[BackupStates.failed]: GenericObject;
	}
}

const createDatabaseSnapshot = async (context: BackupMachineContext) => {
	const { site } = context;

	sendIPCEvent('updateSiteStatus', site.id, 'exporting_db');

	sendIPCEvent('updateSiteMessage', site.id, {
		label: 'Creating database snapshot for backup',
		stripes: true,
	});

	return await siteDatabase.dump(site, path.join(site.paths.sql, backupSQLDumpFile));
};

const maybeCreateBackupSite = async (context: BackupMachineContext) => {
	const { site } = context;
	let { localBackupRepoID } = getSiteDataFromDisk(site.id);
	let encryptionPassword;
	let backupSiteID;

	sendIPCEvent('updateSiteStatus', site.id, 'backing_up');

	/**
	 * A backupSite is a vehicle for managing the uuid (localBackupRepoID) and the encryption password
	 * for a site. These two values will be used with every provider
	 */
	if (localBackupRepoID) {
		const { uuid, password, id } = await getBackupSite(localBackupRepoID);

		localBackupRepoID = uuid;
		encryptionPassword = password;
		backupSiteID = id;
	} else {
		const { uuid, password, id } = await createBackupSite(site);

		localBackupRepoID = uuid;
		encryptionPassword = password;
		backupSiteID = id;
		updateSite(site.id, { localBackupRepoID });
	}

	return {
		encryptionPassword,
		backupSiteID,
		localBackupRepoID,
	};
};

const maybeCreateBackupRepo = async (context: BackupMachineContext) => {
	const { provider, backupSiteID } = context;
	/**
	 * Read site data from disk to ensure most up to date value for localBackupRepoID
	 */
	const site = getSiteDataFromDisk(context.site.id);
	const { localBackupRepoID } = site;
	const hubProvider = providerToHubProvider(provider);
	/**
	 * A backupRepo is a vehicle for managing a site repo on a provider. There will be one of these for each provider
	 * that holds a backup of a particular site
	 */
	let backupRepo;
	let backupRepoAlreadyExists = true;
	backupRepo = (await getBackupReposByProviderID(hubProvider)).find(({ hash }) => hash === localBackupRepoID);

	/**
	 * If this already exists on the Hub side, then we assume that the restic repo has been initialized
	 * on the given provider. Otherwise, if no backup repo is found, than we probably haven't created it on
	 * the hub side for the given provider
	 */
	if (!backupRepo) {
		backupRepoAlreadyExists = false;
		backupRepo = await createBackupRepo({
			backupSiteID,
			localBackupRepoID,
			provider: hubProvider,
		});
	}

	return {
		backupRepoAlreadyExists,
		backupRepoID: backupRepo.id,
	};
};

const initResticRepo = async (context: BackupMachineContext) => {
	const { provider, localBackupRepoID, encryptionPassword, site } = context;
	return await initRepo({ provider, localBackupRepoID, encryptionPassword, site });
};

const deleteHubRepoRecord = async (context: BackupMachineContext) => {
	const { backupRepoID, backupSiteID } = context;

	await deleteBackupRepoRecord({ backupSiteID, backupRepoID });
};

/**
 * Restic outputs periodic updates as in creates a snapshot. This util parses out the snapshot id
 * from that output
 *
 * @param output
 * @returns
 */
export const parseSnapshotIDFromStdOut = (output: string) => {
	const line = output
		.split('\n')
		.find((line) => line.match(/snapshot_id/g));

	const { snapshot_id: resticSnapshotHash } = JSON.parse(line);

	return resticSnapshotHash;
};

const createHubSnapshot = async (context: BackupMachineContext) => {
	const { site, backupRepoID, localBackupRepoID, description } = context;
	const { name, services, mysql } = site;
	const metaData: SiteMetaData = { name, services, mysql, localBackupRepoID, description };

	return await createBackupSnapshot(backupRepoID, metaData);
};

const createResticSnapshot = async (context: BackupMachineContext) => {
	const {
		site,
		provider,
		encryptionPassword,
		localBackupRepoID,
		description,
		initialSiteStatus,
		snapshot,
	} = context;
	const { name, services, mysql } = site;
	const metaData: SiteMetaData = { name, services, mysql, localBackupRepoID, description };
	const metaDataFilePath = path.join(formatHomePath(site.path), metaDataFileName);

	await updateBackupSnapshot({ snapshotID: snapshot.id, status: 'started' });

	fs.removeSync(metaDataFilePath);
	fs.writeFileSync(metaDataFilePath, JSON.stringify(metaData));

	const [res] = await Promise.all([
		createProviderSnapshot(site, provider, encryptionPassword),
		updateBackupSnapshot({ snapshotID: snapshot.id, status: 'running' }),
	]);

	const resticSnapshotHash = parseSnapshotIDFromStdOut(res);
	fs.removeSync(metaDataFilePath);

	await updateBackupSnapshot({ snapshotID: snapshot.id, resticSnapshotHash, status: 'complete' });

	sendIPCEvent('updateSiteStatus', site.id, initialSiteStatus);
};

const deleteHubSnapshotRecord = async (context: BackupMachineContext) => {
	const { snapshot } = context;

	await deleteBackupSnapshotRecord({ snapshotID: snapshot.id });
};

const onErrorFactory = (additionalActions = []) => ({
	target: BackupStates.failed,
	actions: [
		'setErrorOnContext',
		'logError',
		'setErroredStatus',
		...additionalActions,
	],
});

const setErroredStatus = (context: BackupMachineContext) => {
	const { initialSiteStatus, site } = context;
	sendIPCEvent('updateSiteStatus', site.id, initialSiteStatus);
};

const assignBackupRepoIDToContext = assign({
	backupRepoID: (context, event: DoneInvokeEvent<{ backupRepoID: number }>) => event.data.backupRepoID,
});

// eslint-disable-next-line new-cap
const backupMachine = Machine<BackupMachineContext, BackupMachineSchema>(
	{
		id: 'createBackup',
		initial: BackupStates.creatingDatabaseSnapshot,
		context: {
			site: null,
			initialSiteStatus: null,
			provider: null,
			description: null,
			encryptionPassword: null,
			backupSiteID: null,
			localBackupRepoID: null,
			backupRepoID: null,
			error: null,
		},
		states: {
			[BackupStates.creatingDatabaseSnapshot]: {
				invoke: {
					id: 'createDatabaseSnapshot',
					src: (context) => createDatabaseSnapshot(context),
					onDone: {
						target: BackupStates.creatingBackupSite,
					},
					onError: onErrorFactory(),
				},
			},
			[BackupStates.creatingBackupSite]: {
				invoke: {
					id: 'maybeCreateBackupSite',
					src: (context) => maybeCreateBackupSite(context),
					onDone: {
						target: BackupStates.creatingBackupRepo,
						actions: assign({
							encryptionPassword: (_, event) => event.data.encryptionPassword,
							backupSiteID: (_, event) => event.data.backupSiteID,
							localBackupRepoID: (_, event) => event.data.localBackupRepoID,
						}),
					},
					onError: onErrorFactory(),
				},
			},
			[BackupStates.creatingBackupRepo]: {
				invoke: {
					src: (context) => maybeCreateBackupRepo(context),
					onDone: [
						{
							target: BackupStates.creatingHubSnapshot,
							actions: assignBackupRepoIDToContext,
							cond: (context, event) => event.data.backupRepoAlreadyExists,
						},
						{
							target: BackupStates.initingResticRepo,
							actions: assignBackupRepoIDToContext,
							cond: (context, event) => !event.data.backupRepoAlreadyExists,
						},
					],
					onError: onErrorFactory(),
				},
			},
			[BackupStates.initingResticRepo]: {
				invoke: {
					src: (context) => initResticRepo(context),
					onDone: {
						target: BackupStates.creatingHubSnapshot,
					},
					onError: onErrorFactory([deleteHubRepoRecord]),
				},
			},
			[BackupStates.creatingHubSnapshot]: {
				invoke: {
					src: (context) => createHubSnapshot(context),
					onDone: {
						target: BackupStates.creatingResticSnapshot,
						actions: assign({
							snapshot: (_, event) => event.data,
						}),
					},
					onError: onErrorFactory(),
				},
			},
			[BackupStates.creatingResticSnapshot]: {
				invoke: {
					src: (context) => createResticSnapshot(context),
					onDone: {
						target: BackupStates.finished,
					},
					onError: onErrorFactory([deleteHubSnapshotRecord]),
				},
			},
			[BackupStates.finished]: {
				type: 'final',
			},
			[BackupStates.failed]: {
				type: 'final',
			},
		},
	},
	{
		actions: {
			maybeCreateBackupSite,
			maybeCreateBackupRepo,
			initResticRepo,
			createHubSnapshot,
			createResticSnapshot,
			// event.error exists when taking the invoke.onError branch in a given state
			setErrorOnContext: assign((context, event) => ({
				error: JSON.stringify({
					message: event.data.toString(),
					type: event.type,
				} as ErrorState),
			})),
			// event.error exists when taking the invoke.onError branch in a given state
			logError: (context, error) => {
				logger.error(error.data);
			},
			setErroredStatus,
		},
	},
);

/**
 * Creates a new state machine instance/service to manage backing up a site
 *
 * @param site
 * @param provider
 * @param description
 */
export const createBackup = (site: Site, provider: Providers, description: string): Promise<null | ErrorState> => {
	if (serviceState.inProgressStateMachine) {
		logger.warn('Backup process aborted: only one backup or restore process is allowed at one time and a backup or restore is already in progress.');

		return Promise.reject('Backup process aborted: only one backup or restore process is allowed at one time and a backup or restore is already in progress.');
	}

	return new Promise((resolve, reject) => {
		const initialSiteStatus = siteProcessManager.getSiteStatus(site);

		const backupService = interpret(backupMachine.withContext({ site, provider, description, initialSiteStatus }))
			.onTransition((state) => {
				const status = camelCaseToSentence(state.value as string);
				logger.info(`${status} [site id: ${site.id}]`);
			})
			.onDone(() => backupService.stop())
			.onStop(() => {
				serviceState.inProgressStateMachine = null;
				// eslint-disable-next-line no-underscore-dangle
				const error: ErrorState = JSON.parse(backupService._state.context.error ?? null);

				if (error) {
					logger.error(JSON.stringify(error));
					reject(error);
				} else {
					siteProcessManager.restart(site);
					resolve(null);
				}
			});

		serviceState.inProgressStateMachine = backupService;
		backupService.start();
	});
};
