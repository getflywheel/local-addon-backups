import path from 'path';
import { Machine, interpret, assign } from 'xstate';
import { getServiceContainer, formatSiteNicename, formatHomePath } from '@getflywheel/local/main';
import { Site as LocalSiteModel, SiteStatus } from '@getflywheel/local';
import tmp from 'tmp';
import type { DirResult } from 'tmp';
import fs from 'fs-extra';
import { getSiteDataFromDisk, camelCaseToSentence } from '../utils';
import { getBackupSite } from '../hubQueries';
import { restoreBackup as restoreResticBackup } from '../cli';
import type { Site, Providers, GenericObject } from '../../types';
import serviceState from './state';
import { backupSQLDumpFile, IPCEVENTS } from '../../constants';

import * as LocalMain from '@getflywheel/local/main';
import * as Local from '@getflywheel/local';
import shortid from 'shortid';

const serviceContainer = getServiceContainer().cradle;
const { localLogger, runSiteSQLCmd, importSQLFile, sendIPCEvent, siteProcessManager } = serviceContainer;

const logger = localLogger.child({
	thread: 'main',
	class: 'BackupAddonCloneService',
});

interface BackupMachineContext {
	baseSite: Site;
	destinationSite?: Site;
	initialSiteStatus?: SiteStatus;
	provider: Providers;
	snapshotHash: string;
	encryptionPassword?: string;
	backupSiteID?: number;
	localBackupRepoID?: string;
	tmpDirData?: DirResult;
	error?: string;
	newSiteName: string;
}

interface BackupMachineSchema {
	states: {
		creatingTmpDir: GenericObject;
		setupDestinationSite: GenericObject;
		gettingBackupCredentials: GenericObject;
		cloningBackup: GenericObject;
		movingSiteFromTmpDir: GenericObject;
		provisioningSite: GenericObject;
		restoringDatabase: GenericObject;
		searchReplaceDomain: GenericObject;
		finished: GenericObject;
		failed: GenericObject;
	}
}

const getCredentials = async (context: BackupMachineContext) => {
	const { baseSite } = context;
	const { localBackupRepoID } = getSiteDataFromDisk(baseSite.id);
	const { uuid, password, id } = await getBackupSite(localBackupRepoID);

	return {
		encryptionPassword: password,
		localBackupRepoID: uuid,
		backupSiteID: id,
	};
};

const setupDestinationSite = async (context: BackupMachineContext) => {
	const { baseSite, newSiteName } = context;

	// make sure we can safely use the name in site path and domain
	const formattedSiteName = formatSiteNicename(newSiteName);

	const dupID = shortid.generate();
	const dupSite = new Local.Site(baseSite);

	const localSitesDir = path.dirname(baseSite.path);

	dupSite.id = dupID;
	dupSite.name = newSiteName;


	dupSite.domain = `${formattedSiteName}.local`;
	dupSite.path = path.join(localSitesDir, formattedSiteName);

	serviceContainer.siteData.addSite(dupSite.id, dupSite);

	const destinationSite = getSiteDataFromDisk(dupSite.id);

	LocalMain.sendIPCEvent('selectSite', dupSite.id, true, true);

	LocalMain.sendIPCEvent('updateSiteStatus', destinationSite.id, 'provisioning');

	LocalMain.sendIPCEvent('updateSiteMessage', destinationSite.id, 'Restoring your site backup');

	return {
		destinationSite,
	};
};

const createTmpDir = async () => ({
	tmpDirData: tmp.dirSync(),
});

const provisionSite = async (context: BackupMachineContext) => {
	const { destinationSite } = context;

	const siteToProvision = new Local.Site(destinationSite);

	await serviceContainer.siteProvisioner.provision(siteToProvision);
};

const importDatabase = async (context: BackupMachineContext) => {
	const { tmpDirData } = context;
	const site = new LocalSiteModel(context.destinationSite);

	/**
	 * @todo it might be worthwhile doing a recursive scan for this file
	 */
	const sqlFile = path.join(
		tmpDirData.name, 'app', 'sql', backupSQLDumpFile,
	);

	if (!fs.existsSync(sqlFile)) {
		logger.warn('No SQL file found in this backup: continuing without database restore');
		return;
	}

	const existingSqlMode = await runSiteSQLCmd({ site, query: 'SELECT @@SQL_MODE;' });

	await runSiteSQLCmd({
		site,
		query: 'SET GLOBAL SQL_MODE=\'NO_AUTO_VALUE_ON_ZERO\';',
	});

	await runSiteSQLCmd({
		site,
		query: `SET names 'utf8'; DROP DATABASE ${site.mysql!.database}; CREATE DATABASE IF NOT EXISTS ${site.mysql!.database};`,
	});

	await importSQLFile(site, sqlFile);

	await runSiteSQLCmd({
		site,
		query: `SET GLOBAL SQL_MODE='${existingSqlMode}';`,
	});
};

const searchReplace = async (context: BackupMachineContext) => {
	const { destinationSite } = context;

	const siteToSearchReplace = new Local.Site(destinationSite);

	await serviceContainer.siteProcessManager.restart(siteToSearchReplace);

	LocalMain.sendIPCEvent('updateSiteStatus', destinationSite.id, 'provisioning');

	LocalMain.sendIPCEvent('updateSiteMessage', destinationSite.id, 'Changing site domain');

	await serviceContainer.siteDatabase.waitForDB(siteToSearchReplace);

	await serviceContainer.changeSiteDomain.changeSiteDomainToHost(siteToSearchReplace);

	await serviceContainer.siteProcessManager.restart(siteToSearchReplace);
};

const moveSiteFromTmpDir = async (context: BackupMachineContext) => {
	const { destinationSite, tmpDirData } = context;

	const sitePath = formatHomePath(destinationSite.path);

	fs.copySync(
		tmpDirData.name,
		sitePath,
	);

	logger.info(`Site contents moved from \'${tmpDirData.name}\' to \'${sitePath}\'`);
};

const cloneBackup = async (context: BackupMachineContext) => {
	const { baseSite, provider, encryptionPassword, snapshotHash, tmpDirData } = context;

	await restoreResticBackup({
		site: baseSite,
		provider,
		encryptionPassword,
		snapshotID: snapshotHash,
		restoreDir: tmpDirData.name,
	});
};

const removeTmpDir = async (context: BackupMachineContext) => {
	const { tmpDirData } = context;

	// removeCallback will error if the tmp directory is not empty
	fs.emptyDirSync(tmpDirData.name);
	tmpDirData.removeCallback();
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
	const { initialSiteStatus, destinationSite } = context;
	sendIPCEvent('updateSiteStatus', destinationSite.id, initialSiteStatus);

	sendIPCEvent('showSiteBanner', {
		siteID: destinationSite.id,
		id: 'site-errored-backup',
		variant: 'error',
		icon: 'warning',
		title: 'Backup errored!',
		message: `There was an error while restoring your backup.`,
	});

	// siteProcessManager.restart(destinationSite);
};

// eslint-disable-next-line new-cap
const cloneMachine = Machine<BackupMachineContext, BackupMachineSchema>(
	/**
	 * - Does restic have a delete flag like rsync?
	 * - Is there a better way that does require doubling disk footprint?
	 * - keep ignored files present when restoring
	 * - can we create a new temp database to import the backup dump? And then if successful then rename it and delete the original
	 */
	{
		id: 'cloneFromBackup',
		initial: 'gettingBackupCredentials',
		context: {
			baseSite: null,
			destinationSite: null,
			initialSiteStatus: null,
			provider: null,
			snapshotHash: null,
			encryptionPassword: null,
			backupSiteID: null,
			localBackupRepoID: null,
			tmpDirData: null,
			error: null,
			newSiteName: null,
		},
		states: {
			gettingBackupCredentials: {
				invoke: {
					src: (context, event) => getCredentials(context),
					onDone: {
						target: 'setupDestinationSite',
						actions: assign((context, { data: { encryptionPassword, backupSiteID, localBackupRepoID } }) => ({
							encryptionPassword,
							backupSiteID,
							localBackupRepoID,
						})),
					},
					onError: onErrorFactory(),
				},
			},
			 setupDestinationSite: {
				invoke: {
					src: (context, event) => setupDestinationSite(context),
					onDone: {
						target: 'creatingTmpDir',
						actions: assign(
							{
								destinationSite: (_, event) => event.data.destinationSite,
							},
						),
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
						target: 'cloningBackup',
						actions: assign({
							tmpDirData: (_, event) => event.data.tmpDirData,
						}),
					},
					onError: onErrorFactory(),
				},
			},
			cloningBackup: {
				invoke: {
					src: (context, event) => cloneBackup(context),
					onDone: {
						target: 'movingSiteFromTmpDir',
					},
					onError: onErrorFactory(),
				},
			},
			movingSiteFromTmpDir: {
				invoke: {
					src: (context, event) => moveSiteFromTmpDir(context),
					onDone: {
						target: 'provisioningSite',
					},
					onError: onErrorFactory(),
				},
			},
			provisioningSite: {
				invoke: {
					src: (context) => provisionSite(context),
					onDone: {
						target: 'restoringDatabase',
					},
					onError: onErrorFactory(),
				},
			},
			restoringDatabase: {
				invoke: {
					src: (context) => importDatabase(context),
					onDone: {
						target: 'searchReplaceDomain',
					},
					onError: onErrorFactory(),
				},
			},
			searchReplaceDomain: {
				invoke: {
					src: (context) => searchReplace(context),
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
			setErroredStatus,
		},
	},
);

/**
 * Creates a new state machine instance/service to manage restoring up a site
 *
 * @param opts
 * @returns
 */
export const cloneFromBackup = async (opts: {
		baseSite: Site;
		provider: Providers;
		snapshotHash: string;
		newSiteName: string;
	}) => {
	if (serviceState.inProgressStateMachine) {
		logger.warn('Restore process aborted: only one backup or restore process is allowed at one time and a backup or restore is already in progress.');
		return;
	}

	const { baseSite, provider, snapshotHash, newSiteName } = opts;

	const initialSiteStatus = siteProcessManager.getSiteStatus(baseSite);

	return new Promise((resolve) => {
		const machine = cloneMachine.withContext({ baseSite, provider, snapshotHash, newSiteName, initialSiteStatus });
		const cloneFromBackupService = interpret(machine)
			.onTransition((state) => {
				sendIPCEvent(IPCEVENTS.BACKUP_STARTED);
				logger.info(camelCaseToSentence(state.value as string));
			})
			.onDone(() => cloneFromBackupService.stop())
			.onStop(() => {
				serviceState.inProgressStateMachine = null;
				// eslint-disable-next-line no-underscore-dangle
				const { error } = cloneFromBackupService._state;

				sendIPCEvent(IPCEVENTS.BACKUP_COMPLETED);

				if (error) {
					resolve({ error });
				}

				resolve(null);
			});

		serviceState.inProgressStateMachine = cloneFromBackupService;
		cloneFromBackupService.start();
	});
};
