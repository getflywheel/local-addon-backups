import path from 'path';
import { Machine, interpret, assign, Interpreter } from 'xstate';
import { formatHomePath, getServiceContainer } from '@getflywheel/local/main';
import tmp from 'tmp';
import type { DirResult } from 'tmp';
import fs from 'fs-extra';
import { getSiteDataFromDisk } from '../utils';
import { getBackupSite } from '../hubQueries';
import { restoreBackup as restoreResticBackup } from '../cli';
import type { Site, Providers, GenericObject } from '../../types';
import serviceState from './state';

const serviceContainer = getServiceContainer().cradle;
const { localLogger } = serviceContainer;

/**
 * @todo create some sort of filter for this logger and the BackupService logger to obscure any
 * passwords passed in restic commands via the --password-command flag
 */
const logger = localLogger.child({
	thread: 'main',
	class: 'BackupAddonRestoreService',
});

interface BackupMachineContext {
	site: Site;
	provider: Providers;
	snapshotID: string;
	encryptionPassword?: string;
	backupSiteID?: number;
	localBackupRepoID?: string;
	tmpDirData?: DirResult;
	error?: string;
}

interface BackupMachineSchema {
	states: {
		creatingTmpDir: GenericObject;
		gettingBackupCredentials: GenericObject;
		movingSiteToTmpDir: GenericObject;
		restoringBackup: GenericObject;
		finished: GenericObject;
		failed: GenericObject;
	}
}

type RestoreInterpreter = Interpreter<BackupMachineContext, BackupMachineSchema>
type SiteServicesByProvider = Map<Providers, RestoreInterpreter>

/**
 * Store to hold state machines while they are in progress
 */
const services = new Map<string, SiteServicesByProvider>();

const getCredentials = async (context: BackupMachineContext) => {
	const { site } = context;
	const { localBackupRepoID } = getSiteDataFromDisk(site.id);
	const { uuid, password, id } = await getBackupSite(localBackupRepoID);

	return {
		encryptionPassword: password,
		localBackupRepoID: uuid,
		backupSiteID: id,
	};
};

const createTmpDir = async () => ({
	tmpDirData: tmp.dirSync(),
});

const moveSiteToTmpDir = async (context: BackupMachineContext) => {
	const { site, tmpDirData } = context;
	/**
	 * Move the entire contents of the site to a tmp dir so that we can easily copy it back should
	 * we encounter any errors while restoring the restic repo
	 */
	const sitePath = formatHomePath(site.path);
	const siteTmpDirPath = path.join(tmpDirData.name, site.name);

	fs.moveSync(
		sitePath,
		siteTmpDirPath,
		/**
		 * @todo ensure that we don't go willy nilly deleting files that are actually symlinks pointing outside of a site directory
		 */
	);

	logger.info(`Site contents moved from \'${sitePath}\' to \'${siteTmpDirPath}\'`);

	/**
	 * moving the site directory also moves the site's root dir. Restic relies on a directory existing when it does the restore step
	 * so we need to make sure that an empty dir exists
	 */
	fs.ensureDirSync(sitePath);
};

const restoreBackup = async (context: BackupMachineContext) => {
	const { site, provider, encryptionPassword, snapshotID } = context;
	await restoreResticBackup({
		site,
		provider,
		encryptionPassword,
		snapshotID,
	});
};

const removeTmpDir = async (context: BackupMachineContext) => {
	const { tmpDirData } = context;
	tmpDirData.removeCallback();
};

const onErrorFactory = () => ({
	target: 'failed',
	actions: [
		'setErrorOnContext',
		'logError',
		'restoreSite',
	],
});

// eslint-disable-next-line new-cap
const restoreMachine = Machine<BackupMachineContext, BackupMachineSchema>(
	/**
	 * - Flip tmp logic
	 * - Does restic have a delete flag like rsync?
	 * - Is there a better way that does require doubling disk footprint?
	 * - keep ignored files present when restoring
	 * - can we create a new temp database to import the backup dump? And then if successful then rename it and delete the original
	 */
	{
		id: 'restoreBackup',
		initial: 'gettingBackupCredentials',
		context: {
			site: null,
			provider: null,
			snapshotID: null,
			encryptionPassword: null,
			backupSiteID: null,
			localBackupRepoID: null,
			tmpDirData: null,
			error: null,
		},
		states: {
			gettingBackupCredentials: {
				invoke: {
					src: (context, event) => getCredentials(context),
					onDone: {
						target: 'creatingTmpDir',
						actions: assign((context, { data: { encryptionPassword, backupSiteID, localBackupRepoID } }) => ({
							encryptionPassword,
							backupSiteID,
							localBackupRepoID,
						})),
					},
					onError: onErrorFactory(),
				},
			},
			/**
			 * @todo refactor this into an action or something else since createTmpDir technically does not need to be async
			 */
			creatingTmpDir: {
				invoke: {
					src: (context, event) => createTmpDir(),
					onDone: {
						target: 'movingSiteToTmpDir',
						actions: assign({
							tmpDirData: (_, event) => event.data.tmpDirData,
						}),
					},
					onError: onErrorFactory(),
				},
			},
			movingSiteToTmpDir: {
				invoke: {
					src: (context, event) => moveSiteToTmpDir(context),
					onDone: {
						target: 'restoringBackup',
					},
					onError: onErrorFactory(),
				},
			},
			restoringBackup: {
				invoke: {
					src: (context, event) => restoreBackup(context),
					onDone: {
						target: 'finished',
					},
					onError: onErrorFactory(),
				},
			},
			finished: {
				type: 'final',
				entry: 'removeTmpDir',
			},
			failed: {
				type: 'final',
			},
		},
	},
	{
		actions: {
			removeTmpDir,
			setErrorOnContext: assign((context, event) => ({
				error: event.data,
			})),
			logError: (context, event) => {
				logger.error(event.data);
			},
			restoreSite: (context, event) => {
				const { tmpDirData, site } = context;

				/**
				 * If tmpDirData does not exists, we can assume that we never made it to the onDone branch of the creatingTmpDir state
				 */
				if (!tmpDirData) {
					return;
				}

				logger.info(`Restoring previous site files due to failed backup restore [site id: ${site.id}]`);

				const formattedSitePath = formatHomePath(site.path);

				fs.ensureDirSync(formattedSitePath);
				fs.moveSync(path.join(tmpDirData.name, site.name), formattedSitePath);

				removeTmpDir(context);
			},
		},
	},
);

/**
 * Creates a new state machine instance/service to manage restoring up a site
 *
 * @param opts
 * @returns
 */
export const restoreFromBackup = async (opts: { site: Site; provider: Providers; snapshotID: string; }) => {
	if (serviceState.inProgressStateMachine) {
		logger.warn('Restore process aborted: only one backup or restore process is allowed at one time and a backup or restore is already in progress.');
		return;
	}

	const { site, provider, snapshotID } = opts;

	return new Promise((resolve) => {
		const machine = restoreMachine.withContext({ site, provider, snapshotID });
		const restoreService = interpret(machine)
			.onTransition((state) => {
				logger.info(state.value);
			})
			.onDone(() => restoreService.stop())
			.onStop(() => {
				serviceState.inProgressStateMachine = null;
				// eslint-disable-next-line no-underscore-dangle
				const { error } = restoreService._state;

				if (error) {
					resolve({ error });
				}

				resolve(null);
			});

		serviceState.inProgressStateMachine = restoreService;
		restoreService.start();
	});
};
