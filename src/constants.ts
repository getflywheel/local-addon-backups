export const URLS = {
	LOCAL_HUB: 'https://hub.localwp.com',
	LOCAL_HUB_BACKUPS:'https://hub.localwp.com/addons/cloud-backups',
	LOCAL_HUB_LOGIN: 'https://hub.localwp.com/login',
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
	GET_ALL_SNAPSHOTS: 'backups:get-all-snapshots-for-site',
	GET_REPOS_BY_SITE_ID: 'backups:get-repos-by-site-id',
	MULTI_MACHINE_GET_AVAILABLE_PROVIDERS: 'backups:get-enabled-providers-multi-machine',
	SHOULD_LOAD_PROMO_BANNER: 'backups:should-load-promo-banner',
	REMOVE_PROMO_BANNER: 'backups:remove-promo-banner',
	OPEN_FILE_AT_PATH: 'backups:open-file-at-path',
	MIGRATE_BACKUPS_START: 'backups:migrate-start',
	MIGRATE_BACKUPS_STATUS: 'backups:migrate-status',
	MIGRATE_BACKUPS_CANCEL: 'backups:migrate-cancel',
	MIGRATE_BACKUPS_PROGRESS: 'backups:migrate-progress',
	MIGRATE_BACKUPS_COMPLETE: 'backups:migrate-complete',
	MIGRATE_BACKUPS_ERROR: 'backups:migrate-error',
	MIGRATE_BACKUPS_CANCELLED: 'backups:migrate-cancelled',
};

export const MULTI_MACHINE_BACKUP_ERRORS = {
	// User has no connected backup providers on Hub
	NO_PROVIDERS_FOUND: 'No connected storage providers found for your Local account! Please connect at least one and try again.',
	// User has not created any site backups on Hub
	NO_SITES_FOUND: 'No site backups found for your Local account user! Please create one or try another account.',
	// User created a backup, and then disconnected the provider so the backups are inaccessible
	NO_SNAPSHOTS_FOUND: 'We couldn\'t find any backups created for this site. Please try another provider or Local account.',
	// Same as above
	NO_CONNECTED_PROVIDERS_FOR_SITE: 'No connected providers found for this site!',
	GENERIC_HUB_CONNECTION_ERROR: 'We could not authenticate your connection. Please verify you are logged into your Local account and try again.',
};

export const LOCAL_ROUTES = {
	ADD_SITE_START: '/main/create-site',
	ADD_SITE_BACKUP_SITE: '/main/add-site/select-site-backup',
	ADD_SITE_BACKUP_SNAPSHOT: '/main/add-site/select-snapshot',
	ADD_SITE_ENVIRONMENT: '/main/add-site/environment',
	ADD_SITE_CREATE_NEW: '/main/add-site/add',
};

export const SHOW_CLOUD_BACKUPS_PROMO_BANNER = 'showCloudBackupsPromoBanner';

export const metaDataFileName = '.local-backups-site-meta-data.json';

export const backupSQLDumpFile = 'local-backup-addon-database-dump.sql';

// max char length for form inputs
export const INPUT_MAX = 50;

// Migration constants
export const DEFAULT_BACKUP_PASSWORD = 'localwp';
export const MIGRATION_STATE_FILE = 'backup-migration-completed.json';
