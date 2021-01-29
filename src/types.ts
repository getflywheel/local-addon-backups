export enum Providers {
	Google = 'google',
	Dropbox = 'dropbox',
}

export interface BackupSite {
	id: number;
	uuid: string;
	password: string;
}

export interface BackupRepo {
	id: number;
	siteID: string;
	providerID: string;
	hash: string;
}

export interface RcloneConfig {
	type: string;
	clientID: string;
	token: string;
}
