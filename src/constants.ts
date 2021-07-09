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
};

export const metaDataFileName = '.local-backups-site-meta-data.json';

export const backupSQLDumpFile = 'local-backup-addon-database-dump.sql';
