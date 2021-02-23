import { Machine, interpret, assign, Interpreter } from 'xstate';
import { getServiceContainer } from '@getflywheel/local/main';
import { getSiteDataFromDisk, providerToHubProvider, updateSite } from './utils';
import {
	getBackupSite,
	createBackupSite,
	getBackupReposByProviderID,
	createBackupRepo,
} from '../hubQueries';
import { initRepo, createSnapshot as createResticSnapshot } from '../cli';
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
	encryptionPassword?: string;
	backupSiteID?: number;
	localBackupRepoID?: string;
	error?: string;
}

interface BackupMachineSchema {
	states: {
		creatingTmpDir: GenericObject;
		// getBackupSite (for encryption pw, etc...)
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

const restoreMachine = Machine<BackupMachineContext, BackupMachineSchema>(
	{
		id: 'restoreBackup',
		initial: 'creatingTmpDir',
		context: {
			site: null,
			provider: null,
			encryptionPassword: null,
			backupSiteID: null,
			localBackupRepoID: null,
			error: null,
		},
		states: {
			creatingTmpDir: {
				invoke: {
					src: (context, event) => null,
					onDone: {
						target: '',
					},
					onError: {
						target: 'failed',
					},
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
		actions: {},
	},
);

export const restoreFromBackup = async (site: Site, provider: Provider) => {
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
		const restoreService = interpret(restoreMachine.withContext({ site, provider }))
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
