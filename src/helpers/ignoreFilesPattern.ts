import glob from 'glob';
import path from 'path';
import fs from 'fs-extra';
import { formatHomePath } from '../helpers/formatHomePath';
import type { Site } from '../types';

export const excludePatterns = ['conf', 'logs'];

export const localBackupsIgnoreFileName = '.localbackupaddonignore.txt';

// Returns an array of directories within the site folder that we want to include in the backup
// Filters out excluded files
export const getFilteredSiteFiles = (site: Pick<Site, 'path'>) => {
	const sitePath = formatHomePath(site.path);

	const filteredSiteFiles: string[] = [
		...glob.sync(`${sitePath}/!(${excludePatterns.join('|')})`),
		...glob.sync(`${sitePath}/.*`),
	];

	return filteredSiteFiles;
};

// returns the path to the site specific ignore file for the site backup
// handles copying the default ignore file into the site prior to site backup
export const getIgnoreFilePath = async (site: Site) => {
	let defaultIgnoreFilePath = path.join(__dirname, '..', 'resources', 'default-ignore-file');

	if (!fs.existsSync(defaultIgnoreFilePath)) {
		defaultIgnoreFilePath = path.join(__dirname, '..', '..', 'resources', 'default-ignore-file');
	}

	const expandedSitePath = formatHomePath(site.path);

	const formerLocalBackupsIgnoreFileName = '.localbackupaddonignore';

	const formerIgnoreFilePath = path.join(expandedSitePath, formerLocalBackupsIgnoreFileName);
	const ignoreFilePath = path.join(expandedSitePath, localBackupsIgnoreFileName);

	if (fs.existsSync(formerIgnoreFilePath)) {
		await fs.rename(formerIgnoreFilePath, ignoreFilePath);
	}

	if (!fs.existsSync(ignoreFilePath)) {
		fs.copySync(defaultIgnoreFilePath, ignoreFilePath);
	}

	return ignoreFilePath;
};
