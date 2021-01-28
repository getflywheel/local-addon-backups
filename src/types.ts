export enum Providers {
	Google = 'google',
	Dropbox = 'dropbox',
}

export interface BackupSite {
	uuid: string;
	password: string;
}

export interface RcloneConfig {
	type: string;
	clientID: string;
	token: string;
}
