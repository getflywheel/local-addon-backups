import path from 'path';
import { Machine, interpret, assign } from 'xstate';
import { getServiceContainer, formatSiteNicename, formatHomePath } from '@getflywheel/local/main';
import { Site as LocalSiteModel } from '@getflywheel/local';
import tmp from 'tmp';
import type { DirResult } from 'tmp';
import fs from 'fs-extra';
import { getSiteDataFromDisk, camelCaseToSentence } from '../utils';
import { getBackupSite } from '../hubQueries';
import { restoreBackup as restoreResticBackup } from '../cli';
import type { Site, Providers, GenericObject } from '../../types';
import { CloneFromBackupStates } from '../../types';
import serviceState from './state';
import { backupSQLDumpFile } from '../../constants';
import * as LocalMain from '@getflywheel/local/main';
import * as Local from '@getflywheel/local';
import shortid from 'shortid';
import { checkForDuplicateSiteName } from '../../helpers/checkForDuplicateSiteName';
import { dialog } from 'electron';

const serviceContainer = getServiceContainer().cradle;
const {
	localLogger,
	runSiteSQLCmd,
	importSQLFile,
	sendIPCEvent,
	siteProcessManager,
	changeSiteDomain,
	siteData,
	siteDatabase,
	siteProvisioner,
} = serviceContainer;

const logger = localLogger.child({
	thread: 'main',
	class: 'BackupAddonCloneService',
});

interface BackupMachineContext {
	baseSite: Site;
	destinationSite?: Site;
	provider: Providers;
	snapshotHash: string;
	encryptionPassword?: string;
	backupSiteID?: number;
	localBackupRepoID?: string;
	tmpDirData?: DirResult;
	error?: string;
	newSiteName: string;
}

interface ErrorState {
	message: string;
	type: string;
}

interface BackupMachineSchema {
	states: {
		[CloneFromBackupStates.creatingTmpDir]: GenericObject;
		[CloneFromBackupStates.setupDestinationSite]: GenericObject;
		[CloneFromBackupStates.gettingBackupCredentials]: GenericObject;
		[CloneFromBackupStates.cloningBackup]: GenericObject;
		[CloneFromBackupStates.movingSiteFromTmpDir]: GenericObject;
		[CloneFromBackupStates.provisioningSite]: GenericObject;
		[CloneFromBackupStates.restoringDatabase]: GenericObject;
		[CloneFromBackupStates.searchReplaceDomain]: GenericObject;
		[CloneFromBackupStates.finished]: GenericObject;
		[CloneFromBackupStates.failed]: GenericObject;
	}
}

const siteDomainTakenError = 'Site name is already taken by another site!';

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

	const duplicateSiteName = await checkForDuplicateSiteName(newSiteName, formattedSiteName);

	if (duplicateSiteName) {
		dialog.showErrorBox('Invalid Site Name', `${newSiteName} is already taken by another site. Please choose a different name.`);
		throw new Error(siteDomainTakenError);
	}

	const dupID = shortid.generate();
	const dupSite: Site = new Local.Site(baseSite);

	const localSitesDir = path.dirname(baseSite.path);

	dupSite.id = dupID;
	dupSite.name = newSiteName;

	delete dupSite.localBackupRepoID;

	// todo - tyler: setup site status as part of site creation to resolve `status.indexof` issue

	dupSite.domain = `${formattedSiteName}.local`;
	dupSite.path = path.join(localSitesDir, formattedSiteName);

	siteData.addSite(dupSite.id, dupSite);

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

	await siteProvisioner.provision(siteToProvision);
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

	LocalMain.sendIPCEvent('updateSiteStatus', destinationSite.id, 'provisioning');

	LocalMain.sendIPCEvent('updateSiteMessage', destinationSite.id, 'Changing site domain');

	await siteDatabase.waitForDB(siteToSearchReplace);

	await changeSiteDomain.changeSiteDomainToHost(siteToSearchReplace);

	await siteProcessManager.restart(siteToSearchReplace);
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
		restoringToNewSite: true,
	});
};

const removeTmpDir = async (context: BackupMachineContext) => {
	const { tmpDirData } = context;

	// removeCallback will error if the tmp directory is not empty
	fs.emptyDirSync(tmpDirData.name);
	tmpDirData.removeCallback();
};

const onErrorFactory = (additionalActions = []) => ({
	target: CloneFromBackupStates.failed,
	actions: [
		'setErrorOnContext',
		'logError',
		'setErroredStatus',
		...additionalActions,
	],
});

const setErroredStatus = (context: BackupMachineContext) => {
	const { baseSite } = context;

	sendIPCEvent('goToRoute', `/main/site-info/${baseSite.id}`);
};

const deleteNewCloneSite = (context: BackupMachineContext) => {
	const { destinationSite } = context;
	sendIPCEvent('deleteSite', { destinationSite, trashFiles: true });
};

// eslint-disable-next-line new-cap
const cloneMachine = Machine<BackupMachineContext, BackupMachineSchema>(
	{
		id: 'cloneFromBackup',
		initial: CloneFromBackupStates.gettingBackupCredentials,
		context: {
			baseSite: null,
			destinationSite: null,
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
			[CloneFromBackupStates.gettingBackupCredentials]: {
				invoke: {
					src: (context) => getCredentials(context),
					onDone: {
						target: CloneFromBackupStates.setupDestinationSite,
						actions: assign((context, { data: { encryptionPassword, backupSiteID, localBackupRepoID } }) => ({
							encryptionPassword,
							backupSiteID,
							localBackupRepoID,
						})),
					},
					onError: onErrorFactory([deleteNewCloneSite]),
				},
			},
			 [CloneFromBackupStates.setupDestinationSite]: {
				invoke: {
					src: (context) => setupDestinationSite(context),
					onDone: {
						target: CloneFromBackupStates.creatingTmpDir,
						actions: assign(
							{
								destinationSite: (_, event) => event.data.destinationSite,
							},
						),
					},
					onError: onErrorFactory([deleteNewCloneSite]),
				},
			},
			/**
			 * @todo refactor this into an action or something else since createTmpDir technically does not need to be async
			 */
			[CloneFromBackupStates.creatingTmpDir]: {
				invoke: {
					src: () => createTmpDir(),
					onDone: {
						target: CloneFromBackupStates.cloningBackup,
						actions: assign({
							tmpDirData: (_, event) => event.data.tmpDirData,
						}),
					},
					onError: onErrorFactory(),
				},
			},
			[CloneFromBackupStates.cloningBackup]: {
				invoke: {
					src: (context) => cloneBackup(context),
					onDone: {
						target: CloneFromBackupStates.movingSiteFromTmpDir,
					},
					onError: onErrorFactory(),
				},
			},
			[CloneFromBackupStates.movingSiteFromTmpDir]: {
				invoke: {
					src: (context) => moveSiteFromTmpDir(context),
					onDone: {
						target: CloneFromBackupStates.provisioningSite,
					},
					onError: onErrorFactory(),
				},
			},
			[CloneFromBackupStates.provisioningSite]: {
				invoke: {
					src: (context) => provisionSite(context),
					onDone: {
						target: CloneFromBackupStates.restoringDatabase,
					},
					onError: onErrorFactory(),
				},
			},
			[CloneFromBackupStates.restoringDatabase]: {
				invoke: {
					src: (context) => importDatabase(context),
					onDone: {
						target: CloneFromBackupStates.searchReplaceDomain,
					},
					onError: onErrorFactory(),
				},
			},
			[CloneFromBackupStates.searchReplaceDomain]: {
				invoke: {
					src: (context) => searchReplace(context),
					onDone: {
						target: CloneFromBackupStates.finished,
					},
					onError: onErrorFactory(),
				},
			},
			[CloneFromBackupStates.finished]: {
				type: 'final',
				entry: 'removeTmpDir',
			},
			[CloneFromBackupStates.failed]: {
				type: 'final',
			},
		},
	},
	{
		actions: {
			removeTmpDir,
			setErrorOnContext: assign((context, event) => ({
				error: JSON.stringify({
					message: event.data.toString(),
					type: event.type,
				} as ErrorState),
			})),
			logError: (context, event) => {
				logger.error(event.data);
			},
			setErroredStatus,
			deleteNewCloneSite,
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
	}): Promise<null | ErrorState> => {
	if (serviceState.inProgressStateMachine) {
		logger.warn('Restore process aborted: only one backup or restore process is allowed at one time and a backup or restore is already in progress.');
		return Promise.reject('Restore process aborted: only one backup or restore process is allowed at one time and a backup or restore is already in progress.');
	}

	const { baseSite, provider, snapshotHash, newSiteName } = opts;

	return new Promise((resolve, reject) => {
		const machine = cloneMachine.withContext({ baseSite, provider, snapshotHash, newSiteName });
		const cloneFromBackupService = interpret(machine)
			.onTransition((state) => {
				logger.info(camelCaseToSentence(state.value as string));
			})
			.onDone(() => cloneFromBackupService.stop())
			.onStop(() => {
				serviceState.inProgressStateMachine = null;
				// eslint-disable-next-line no-underscore-dangle
				const error: ErrorState = JSON.parse(cloneFromBackupService._state.context.error ?? null);

				if (error) {
					logger.error(JSON.stringify(error));
					reject(error);
				} else {
					resolve(null);
				}
			});

		serviceState.inProgressStateMachine = cloneFromBackupService;
		cloneFromBackupService.start();
	});
};
