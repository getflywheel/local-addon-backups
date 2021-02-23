import { Machine, interpret, assign, Interpreter } from 'xstate';
import { getServiceContainer } from '@getflywheel/local/main';
import { getSiteDataFromDisk, providerToHubProvider, updateSite } from './utils';
import {
	getBackupSite,
	createBackupSite,
	getBackupReposByProviderID,
	createBackupRepo,
} from './hubQueries';
import { initRepo, createSnapshot as createResticSnapshot } from './cli';
import type { Site, Providers, GenericObject } from '../types';


const serviceContainer = getServiceContainer().cradle;
const { localLogger } = serviceContainer;

const logger = localLogger.child({
	thread: 'main',
	class: 'BackupAddonBackupService',
});


interface BackupMachineContext {
	site: Site;
	provider: Providers;
	encryptionPassword?: string;
	backupSiteID?: number;
	localBackupRepoID?: string;
	error?: string;
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

type BackupInterpreter = Interpreter<BackupMachineContext, BackupMachineSchema>
type SiteServicesByProvider = Map<Providers, BackupInterpreter>

/**
 * Store to hold state machines while they are in progress
 */
const services = new Map<string, SiteServicesByProvider>();

const maybeCreateBackupSite = async (context: BackupMachineContext) => {
	const { site } = context;

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

	return {
		encryptionPassword,
		backupSiteID,
	};
};

const maybeCreateBackupRepo = async (context: BackupMachineContext) => {
	const { provider, site, backupSiteID, encryptionPassword } = context;
	const { localBackupRepoID } = site;
	const hubProvider = providerToHubProvider(provider);
	/**
	 * @todo figure out how to query for repos by uuid of the site backup objects
	 * This should theoretically work, but currently appears to be broken on the Hub side:
	 * const backupRepo = await getBackupRepo(backupSiteID, provider);
	 *
	 * A backupRepo is a vehicle for managing a site repo on a provider. There will be one of these for each provider
	 * that holds a backup of a particular site
	 */
	let backupRepo;
	if (localBackupRepoID) {
		backupRepo = (await getBackupReposByProviderID(hubProvider)).find(({ hash }) => hash === localBackupRepoID);
	}

	/**
	 * If this already exists on the Hub side, then we assume that the restic repo has been initialized
	 * on the given provider
	 */
	if (backupRepo) {
		return {
			backupRepoAlreadyExists: true,
		};
	}

	/**
	 * If no backup repo is found, than we probably haven't created on on the hub side for the given provider
	 */
	backupRepo = await createBackupRepo(backupSiteID, localBackupRepoID, hubProvider);
	await initRepo({ provider, localBackupRepoID, encryptionPassword });

	return {
		backupRepoAlreadyExists: false,
	};
};

const initResticRepo = async (context: BackupMachineContext) => {
	const { provider, localBackupRepoID, encryptionPassword } = context;
	await initRepo({ provider, localBackupRepoID, encryptionPassword });
};

const createSnapshot = async (context: BackupMachineContext) => {
	const { site, provider, encryptionPassword } = context;
	await createResticSnapshot(site, provider, encryptionPassword);
};

const onErrorFactory = () => ({
	target: 'failed',
	actions: [
		'setErrorOnContext',
		'logError',
	],
});

// eslint-disable-next-line new-cap
const backupMachine = Machine<BackupMachineContext, BackupMachineSchema>(
	{
		id: 'createBackup',
		initial: 'creatingBackupSite',
		context: {
			site: null,
			provider: null,
			encryptionPassword: null,
			backupSiteID: null,
			localBackupRepoID: null,
			error: null,
		},
		states: {
			creatingBackupSite: {
				invoke: {
					id: 'maybeCreateBackupSite',
					src: (context, event) => maybeCreateBackupSite(context),
					onDone: {
						target: 'creatingBackupRepo',
						actions: assign({
							encryptionPassword: (_, event) => event.data.encryptionPassword,
							backupSiteID: (_, event) => event.data.backupSiteID,
						}),
					},
					onError: onErrorFactory(),
				},
			},
			creatingBackupRepo: {
				invoke: {
					src: (context, event) => maybeCreateBackupRepo(context),
					onDone: [
						{
							target: 'creatingSnapshot',
							cond: (context, event) => event.data.backupRepoAlreadyExists,
						},
						{
							target: 'initingResticRepo',
							cond: (context, event) => !event.data.backupRepoAlreadyExists,
						},
					],
					onError: onErrorFactory(),
				},
			},
			initingResticRepo: {
				invoke: {
					src: (context, event) => initResticRepo(context),
					onDone: {
						target: 'creatingSnapshot',
					},
					onError: onErrorFactory(),
				},
			},
			creatingSnapshot: {
				invoke: {
					src: (context, event) => createSnapshot(context),
					onDone: {
						target: 'finished',
					},
					onError: onErrorFactory(),
				},
			},
			finished: {
				type: 'final',
			},
			failed: {
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
			setErrorOnContext: assign((context, event) => ({
				error: event.data,
			})),
			logError: (context, error) => {
				logger.error('Error backing up site:', error.data);
			},
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
// eslint-disable-next-line arrow-body-style
export const createBackup = async (site: Site, provider: Providers) => {
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
		const backupService = interpret(backupMachine.withContext({ site, provider }))
			.onTransition((state) => {
				logger.info(state.value);
			})
			.onDone(() => backupService.stop())
			.onStop(() => {
				siteServices.delete(provider);
				// eslint-disable-next-line no-underscore-dangle
				const { error } = backupService._state;

				if (error) {
					resolve({ error });
				}

				resolve(null);
			});

		siteServices.set(provider, backupService);
		backupService.start();
	});
};
