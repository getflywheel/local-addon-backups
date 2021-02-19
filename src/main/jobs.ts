import { getSiteDataFromDisk, providerToHubProvider, updateSite } from './utils';
import {
	getBackupSite,
	createBackupSite,
	getBackupReposByProviderID,
	createBackupRepo,
} from './hubQueries';
import { initRepo } from './cli';
import type { Providers, Site } from '../types';

type Jobs = {
	[siteID: string]: {
		[Providers.Drive]: boolean;
		[Providers.Dropbox]: boolean;
	};
};

class JobsManager {
	/**
	 * Track jobs (or state machines) as the progress for each site. This has the added benefit
	 * of allowing easy prevention of multiple simultaneous jobs for a single site
	 */
	jobs: Jobs = {};

	/**
	 * Mark a job in progress for a site and provider
	 *
	 * @param siteID
	 * @param provider
	 */
	addJob = (siteID: Site['id'], provider: Providers) => {
		this.jobs[siteID][provider] = true;
	}

	/**
	 * Unmark a job as in progress for a site and provider
	 *
	 * @param siteID
	 * @param provider
	 */
	removeJob = (siteID: Site['id'], provider: Providers) => {
		this.jobs[siteID][provider] = false;
	}

	/**
	 * Utility to check if a job is currently marked as in progress
	 *
	 * @param siteID
	 * @param provider
	 */
	getJob = (siteID: Site['id'], provider: Providers) => this.jobs[siteID]?.[provider];

	createBackup = async (site: Site, provider: Providers) => {
		if (this.getJob(site.id, provider)) {
			return;
		}

		this.addJob(site.id, provider);
		/**
		 * check for backup site and create if necessary
		 * check for backup repo for the current provider and create if necessary
		 * if the repo did not exist, then init with restic
		 *
		 * If the repo exists on Hub, then we should assume that it exists on restic. That said, if restic fails, then we should delete the Hub repo
		 */

		const hubProvider = providerToHubProvider(provider);
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

		/**
		 * @todo figure out how to query for repos by uuid of the site backup objects
		 * This should theoretically work, but currently appears to be broken on the Hub side:
		 *
		 * const backupRepo = await getBackupRepo(backupSiteID, provider);
		 *
		 * A backupRepo is a vehicle for managing a site repo on a provider. There will be one of these for each provider
		 * that holds a backup of a particular site
		 */
		let backupRepo = (await getBackupReposByProviderID(hubProvider)).find(({ hash }) => hash === localBackupRepoID);

		/**
		 * If no backup repo is found, than we probably haven't created on on the hub side for the given provider
		 */
		if (!backupRepo) {
			backupRepo = await createBackupRepo(backupSiteID, localBackupRepoID, hubProvider);
			await initRepo({ provider, localBackupRepoID, encryptionPassword });
		}

		this.removeJob(site.id, provider);
	}
}

export default JobsManager;
