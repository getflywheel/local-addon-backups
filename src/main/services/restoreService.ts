import { Machine, interpret, assign, Interpreter } from 'xstate';
import { formatHomePath, getServiceContainer } from '@getflywheel/local/main';
import tmp from 'tmp';
import type { DirResult } from 'tmp';
import { moveSync } from 'fs-extra';
import { getSiteDataFromDisk } from '../utils';
import { getBackupSite } from '../hubQueries';
import { restoreBackup as restoreResticBackup } from '../cli';
import type { Site, Providers, GenericObject } from '../../types';

const serviceContainer = getServiceContainer().cradle;
const { localLogger } = serviceContainer;

const logger = localLogger.child({
	thread: 'main',
	class: 'BackupAddonRestoreService',
});


interface BackupMachineContext {
	site: Site;
	provider: Providers;
	snapshotID: number;
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
	moveSync(
		formatHomePath(site.path),
		tmpDirData.name,
		/**
		 * @todo ensure that we don't go willy nilly deleting files that are actually symlinks pointing outside of a site directory
		 *
		 * dereference any symlinks so that we do not accidentally delete any files outside of the site directory when we clean up
		 * the tmp directory
		 */
		// { dereference: true },
	);
};

const restoreBackup = async (context: BackupMachineContext) => {
	const { site, provider, encryptionPassword } = context;
	await restoreResticBackup({
		site,
		provider,
		encryptionPassword,
		restorePath: formatHomePath(site.path),
	});
};

const removeTmpDir = async (context: BackupMachineContext) => {
	const { tmpDirData } = context;
	tmpDirData.removeCallback();
};

// eslint-disable-next-line new-cap
const restoreMachine = Machine<BackupMachineContext, BackupMachineSchema>(
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
					onError: {
						target: 'failed',
					},
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
					onError: {
						target: 'failed',
					},
				},
			},
			movingSiteToTmpDir: {
				invoke: {
					src: (context, event) => moveSiteToTmpDir(context),
					onDone: {
						target: 'restoringBackup',
					},
					onError: {
						target: 'failed',
					},
				},
			},
			restoringBackup: {
				invoke: {
					src: (context, event) => restoreBackup(context),
					onDone: {
						target: 'finished',
					},
					onError: {
						target: 'failed',
					},
				},
			},
			finished: {
				type: 'final',
				entry: 'removeTmpDir',
			},
			failed: {
				type: 'final',
				entry: 'removeTmpDir',
			},
		},
	},
	{
		actions: {
			removeTmpDir,
		},
	},
);

export const restoreFromBackup = async (site: Site, provider: Providers, snapshotID: number) => {
	/**
	 * @todo share services with backupService so that we can easily prevent a backup/restore from happening simultaneously
	 */
	if (!services.has(site.id)) {
		services.set(site.id, new Map());
	}

	const siteServices = services.get(site.id);
	/**
	 * Silently exit if a backup is already in progress for this site/provider
	 */
	if (siteServices.has(provider)) {
		return;
	}

	return new Promise((resolve) => {
		const machine = restoreMachine.withContext({ site, provider, snapshotID });
		const restoreService = interpret(machine)
			.onTransition((state) => {
				logger.info(state.value);
			})
			.onDone(() => restoreService.stop())
			.onStop(() => {
				siteServices.delete(provider);
				// eslint-disable-next-line no-underscore-dangle
				const { error } = restoreService._state;

				if (error) {
					resolve({ error });
				}

				resolve(null);
			});
	});
};
