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
} from '../hubQueries';
import { initRepo, createSnapshot as createResticSnapshot } from '../cli';
import type { Site, Providers, GenericObject, SiteMetaData } from '../../types';
import { metaDataFileName, backupSQLDumpFile, IPCEVENTS } from '../../constants';
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
	localBackupRepoID?: string;
	error?: string;
}

interface BackupMachineSchema {
	states: {
		[BackupStates.creatingDatabaseSnapshot]: GenericObject;
		[BackupStates.creatingBackupSite]: GenericObject;
		[BackupStates.creatingBackupRepo]: GenericObject;
		[BackupStates.initingResticRepo]: GenericObject;
		[BackupStates.creatingSnapshot]: GenericObject;
		[BackupStates.finished]: GenericObject;
		[BackupStates.failed]: GenericObject;
	}
}

const createDatabaseSnapshot = async (context: BackupMachineContext) => {
	const { site, initialSiteStatus } = context;

	sendIPCEvent('updateSiteStatus', site.id, 'exporting_db');

	sendIPCEvent('updateSiteMessage', site.id, {
		label: 'Creating database snapshot for backup',
		stripes: true,
	});

	await siteDatabase.dump(site, path.join(site.paths.sql, backupSQLDumpFile));

	sendIPCEvent('updateSiteStatus', site.id, initialSiteStatus);
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

/**
 * @todo If this fails, we need to delete the backup repo on the Hub side
 */
const initResticRepo = async (context: BackupMachineContext) => {
	const { provider, localBackupRepoID, encryptionPassword, site } = context;
	await initRepo({ provider, localBackupRepoID, encryptionPassword, site });
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

/**
 * @todo remove backup snapshot on the Hub side if restic call fails
 */
const createSnapshot = async (context: BackupMachineContext) => {
	const { site, provider, encryptionPassword, backupRepoID, localBackupRepoID, description, initialSiteStatus } = context;
	const { name, services, mysql } = site;
	const metaData: SiteMetaData = { name, services, mysql, localBackupRepoID, description };
	const metaDataFilePath = path.join(formatHomePath(site.path), metaDataFileName);

	const snapshot = await createBackupSnapshot(backupRepoID, metaData);
	await updateBackupSnapshot({ snapshotID: snapshot.id, status: 'started' });

	fs.removeSync(metaDataFilePath);
	fs.writeFileSync(metaDataFilePath, JSON.stringify(metaData));

	const [res] = await Promise.all([
		createResticSnapshot(site, provider, encryptionPassword),
		updateBackupSnapshot({ snapshotID: snapshot.id, status: 'running' }),
	]);

	const resticSnapshotHash = parseSnapshotIDFromStdOut(res);

	fs.removeSync(metaDataFilePath);

	await updateBackupSnapshot({ snapshotID: snapshot.id, resticSnapshotHash, status: 'complete' });

	sendIPCEvent('updateSiteStatus', site.id, initialSiteStatus);

	sendIPCEvent('showSiteBanner', {
		siteID: site.id,
		variant: 'success',
		icon: false,
		id: 'site-backed-up',
		title: 'Backup complete!',
		message: `${site.name} has been successfully backed up.`,
	});
};

const onErrorFactory = () => ({
	target: 'failed',
	actions: [
		'setErrorOnContext',
		'logError',
		'setErroredStatus',
	],
});

const setErroredStatus = (context: BackupMachineContext) => {
	const { initialSiteStatus, site } = context;
	sendIPCEvent('updateSiteStatus', site.id, initialSiteStatus);

	sendIPCEvent('showSiteBanner', {
		siteID: site.id,
		id: 'site-errored-backup',
		variant: 'error',
		icon: 'warning',
		title: 'Backup errored!',
		message: `There was an error while completing your backup.`,
	});

	siteProcessManager.restart(site);
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
						target: 'creatingBackupSite',
					},
					onError: onErrorFactory(),
				},
			},
			[BackupStates.creatingBackupSite]: {
				invoke: {
					id: 'maybeCreateBackupSite',
					src: (context, event) => maybeCreateBackupSite(context),
					onDone: {
						target: 'creatingBackupRepo',
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
					src: (context, event) => maybeCreateBackupRepo(context),
					onDone: [
						{
							target: 'creatingSnapshot',
							actions: assignBackupRepoIDToContext,
							cond: (context, event) => event.data.backupRepoAlreadyExists,
						},
						{
							target: 'initingResticRepo',
							actions: assignBackupRepoIDToContext,
							cond: (context, event) => !event.data.backupRepoAlreadyExists,
						},
					],
					onError: onErrorFactory(),
				},
			},
			[BackupStates.initingResticRepo]: {
				invoke: {
					src: (context, event) => initResticRepo(context),
					onDone: {
						target: 'creatingSnapshot',
					},
					onError: onErrorFactory(),
				},
			},
			[BackupStates.creatingSnapshot]: {
				invoke: {
					src: (context, event) => createSnapshot(context),
					onDone: {
						target: 'finished',
					},
					onError: onErrorFactory(),
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
			createSnapshot,
			// event.error exists when taking the invoke.onError branch in a given state
			setErrorOnContext: assign((context, event) => ({
				error: event.data,
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
 */
// eslint-disable-next-line arrow-body-style
export const createBackup = async (site: Site, provider: Providers, description: string) => {
	if (serviceState.inProgressStateMachine) {
		logger.warn('Backup process aborted: only one backup or restore process is allowed at one time and a backup or restore is already in progress.');
		return;
	}

	return new Promise((resolve) => {
		const initialSiteStatus = siteProcessManager.getSiteStatus(site);

		const backupService = interpret(backupMachine.withContext({ site, provider, description, initialSiteStatus }))
			.onTransition((state) => {
				sendIPCEvent(IPCEVENTS.BACKUP_STARTED);
				const status = camelCaseToSentence(state.value as string);
				logger.info(`${status} [site id: ${site.id}]`);
				sendIPCEvent('updateSiteStatus', site.id, status);
			})
			.onDone(() => backupService.stop())
			.onStop(() => {
				serviceState.inProgressStateMachine = null;
				// eslint-disable-next-line no-underscore-dangle
				const { error } = backupService._state;

				siteProcessManager.restart(site);
				sendIPCEvent(IPCEVENTS.BACKUP_COMPLETED);

				if (error) {
					resolve({ error });
				}

				siteProcessManager.restart(site);

				resolve(null);
			});

		serviceState.inProgressStateMachine = backupService;
		backupService.start();
	});
};
