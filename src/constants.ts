export const URLS = {
	LOCAL_HUB: 'https://hub-staging.localwp.com',
};

export const IPCEVENTS = {
	BACKUP_STARTED: 'backupServiceStarted:backups',
	BACKUP_COMPLETED: 'backupServiceCompleted:backups',
};

export const IPCASYNC_EVENTS = {
	GET_ENABLED_PROVIDERS: 'backups:enabled-providers',
	START_BACKUP: 'backups:backup-site',
	GET_SITE_PROVIDER_BACKUPS: 'backups:provider-snapshots',
	RESTORE_BACKUP: 'backups:restore-backup',
	CLONE_BACKUP: 'backups:restore-site-clone',
};

export const metaDataFileName = '.local-backups-site-meta-data.json';

export const backupSQLDumpFile = 'local-backup-addon-database-dump.sql';
