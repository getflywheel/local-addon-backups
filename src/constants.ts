export const URLS = {
	LOCAL_HUB: 'https://hub.localwp.com',
};

export const IPCASYNC_EVENTS = {
	GET_ENABLED_PROVIDERS: 'backups:enabled-providers',
	START_BACKUP: 'backups:backup-site',
	GET_SITE_PROVIDER_BACKUPS: 'backups:provider-snapshots',
	RESTORE_BACKUP: 'backups:restore-backup',
	CLONE_BACKUP: 'backups:restore-site-clone',
	CHECK_FOR_DUPLICATE_NAME: 'backups:check-for-duplicate-sitename',
	EDIT_BACKUP_DESCRIPTION: 'backups:edit-backup-description',
	GET_ALL_SITES: 'backups:get-all-sites-for-user',
	GET_ALL_SNAPSHOTS: 'backup:get-all-snapshots-for-site',
	GET_REPOS_BY_SITE_ID: 'backup:get-repos-by-site-id',
	MULTI_MACHINE_GET_AVAILABLE_PROVIDERS: 'backup:get-enabled-providers-multi-machine',
};

export const MULTI_MACHINE_BACKUP_ERRORS = {
	// User has no connected backup providers on Hub
	NO_PROVIDERS_FOUND: 'No providers found!',
	// User has not created any site backups on Hub
	NO_SITES_FOUND: 'No sites found!',
	// User created a backup, and then disconnected the provider so the backups are inaccessible
	NO_SNAPSHOTS_FOUND: 'No snapshots found!',
	// Same as above
	NO_CONNECTED_PROVIDERS_FOR_SITE: 'No connected providers found for this site!',
};

export const LOCAL_ROUTES = {
	ADD_SITE_START: '/main/add-site',
	ADD_SITE_BACKUP_SITE: '/main/add-site/select-site-backup',
	ADD_SITE_BACKUP_SNAPSHOT: '/main/add-site/select-snapshot',
	ADD_SITE_ENVIRONMENT: '/main/add-site/environment',
	ADD_SITE_CREATE_NEW: '/main/add-site/add',
};

export const metaDataFileName = '.local-backups-site-meta-data.json';

export const backupSQLDumpFile = 'local-backup-addon-database-dump.sql';

// max char length for form inputs
export const INPUT_MAX = 50;
