import { Machine, interpret, assign } from 'xstate';
import { getSiteDataFromDisk, providerToHubProvider, updateSite } from './utils';
import {
	getBackupSite,
	createBackupSite,
	getBackupReposByProviderID,
	createBackupRepo,
} from './hubQueries';
import { initRepo, createSnapshot as createResticSnapshot } from './cli';
import type { Providers, Site, GenericObject } from '../types';

interface BackupMachineContext {
	site: Site;
	provider: Providers;
	encryptionPassword?: string;
	backupSiteID?: number;
	localBackupRepoID?: string;
	errorMessage?: string;
}

interface BackupMachineSchema {
	states: {
		creatingBackupSite: GenericObject;
		creatingBackupRepo: GenericObject;
		initingResticRepo: GenericObject;
		creatingSnapshot: GenericObject;
		finished: GenericObject;
		failed: GenericObject;
	}
}

type BackupMachineEvent =
	| { type: 'SUCCESS'; encryptionPassword?: string; backupSiteID?: string; localBackupRepoID?: string; }
	| { type: 'ALREADY_EXISTS' }
	| { type: 'FAIL' };

const services = {};

const maybeCreateBackupSite = async (context: BackupMachineContext) => {
	const { site, provider } = context;
	const service = services[site.id][provider];

	let { localBackupRepoID } = getSiteDataFromDisk(site.id);

	let encryptionPassword;
	let backupSiteID;

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

	service.send({
		type: 'SUCCESS',
		encryptionPassword,
		backupSiteID,
		localBackupRepoID,
	});
};

const maybeCreateBackupRepo = async (context: BackupMachineContext) => {
	const { provider, site, localBackupRepoID, backupSiteID, encryptionPassword } = context;
	const hubProvider = providerToHubProvider(provider);
	const service = services[site.id][provider];
	/**
	 * @todo figure out how to query for repos by uuid of the site backup objects
	 * This should theoretically work, but currently appears to be broken on the Hub side:
	 * const backupRepo = await getBackupRepo(backupSiteID, provider);
	 *
	 * A backupRepo is a vehicle for managing a site repo on a provider. There will be one of these for each provider
	 * that holds a backup of a particular site
	 */
	let backupRepo = (await getBackupReposByProviderID(hubProvider)).find(({ hash }) => hash === localBackupRepoID);

	/**
	 * If this already exists on the Hub side, then we assume that the restic repo has been initialized
	 * on the given provider
	 */
	if (backupRepo) {
		service.send({
			type: 'ALREADY_EXISTS',
		});

		return;
	}

	/**
	 * If no backup repo is found, than we probably haven't created on on the hub side for the given provider
	 */
	backupRepo = await createBackupRepo(backupSiteID, localBackupRepoID, hubProvider);
	await initRepo({ provider, localBackupRepoID, encryptionPassword });

	service.send({
		type: 'SUCCESS',
	});
};

const initResticRepo = async (context: BackupMachineContext) => {
	const { site, provider, localBackupRepoID, encryptionPassword } = context;
	const service = services[site.id][provider];
	try {
		await initRepo({ provider, localBackupRepoID, encryptionPassword });
	} catch (err) {
		service.send({
			type: 'FAIL',
			errorMessage: err,
		});
	}

	service.send({
		type: 'SUCCESS',
	});
};

const createSnapshot = async (context: BackupMachineContext) => {
	const { site, provider, encryptionPassword } = context;
	const service = services[site.id][provider];

	await createResticSnapshot(site, provider, encryptionPassword);

	service.send({
		type: 'SUCCESS',
	});
};

// eslint-disable-next-line new-cap
const backupMachine = Machine<BackupMachineContext, BackupMachineSchema, BackupMachineEvent>(
	{
		id: 'createBackup',
		initial: 'creatingBackupSite',
		// can use withContext to extend this before interpreting to give the instance the site and provider
		context: {
			site: null,
			provider: null,
			encryptionPassword: null,
			backupSiteID: null,
			localBackupRepoID: null,
			errorMessage: null,
		},
		states: {
			creatingBackupSite: {
				entry: ['maybeCreateBackupSite'],
				exit: [
					assign({
						encryptionPassword: (context, event) => event.encryptionPassword,
						backupSiteID: (_, event) => event.backupSiteID,
						localBackupRepoID: (_, event) => event.localBackupRepoID,
					}),
				],
				on: {
					SUCCESS: {
						target: 'creatingBackupRepo',
					},
					FAIL: 'failed',
				},
			},
			creatingBackupRepo: {
				entry: ['maybeCreateBackupRepo'],
				on: {
					ALREADY_EXISTS: {
						target: 'creatingSnapshot',
					},
					SUCCESS: {
						target: 'initingResticRepo',
					},
					FAIL: 'failed',
				},
			},
			initingResticRepo: {
				entry: ['initResticRepo'],
				on: {
					SUCCESS: {
						target: 'creatingSnapshot',
						actions: ['createSnapshot'],
					},
					FAIL: 'failed',
				},
			},
			creatingSnapshot: {
				entry: ['createSnapshot'],
				on: {
					SUCCESS: 'finished',
					FAIL: 'failed',
				},
			},
			finished: {
				type: 'final',
			},
			failed: {
				type: 'final',
				/**
				 * @todo use this entry action to notify the UI of the error and also dump some logs into the Local logger
				 */
				entry: [],
			},
		},
	},
	{
		actions: {
			maybeCreateBackupSite,
			maybeCreateBackupRepo,
			initResticRepo,
			createSnapshot,
		},
	},
);

/**
 * Create a site backup
 *
 * Creates a new state machine instance/service
 * @param site
 * @param provider
 */
export const createBackup = (site: Site, provider: Providers) => {
	const backupService = interpret(backupMachine.withContext({ site, provider }))
		.onTransition((state) => console.log('state -----', state.value, state.context));

	services[site.id] = {};
	services[site.id][provider] = backupService;

	backupService.start();
};
