import glob from 'glob';
import { formatHomePath } from '../helpers/formatHomePath';
import type { Site } from '../types';

export const excludePatterns = ['conf'];

// Returns an array of directories within the site folder that we want to include in the backup
// Filters out the 'conf' directory and any `.` files
export const getFilteredSiteFiles = (site: Site) => {
	const sitePath = formatHomePath(site.path);

	const filteredSiteFiles: string[] = [
		...glob.sync(`${sitePath}/!(${excludePatterns.join('|')})`),
		...glob.sync(`${sitePath}/.*`),
	];

	return filteredSiteFiles;
};
