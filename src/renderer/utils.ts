import getSize from 'get-folder-size';
import type { Site } from '../types';
import { getFilteredSiteFiles } from '../helpers/ignoreFilesPattern';


export const getSiteSizeEstimate = (site: Site) => {
	const filesToEstimate = getFilteredSiteFiles(site);
	const fileSizes = [];

	filesToEstimate.forEach((dir) => {
		getSize(dir, (err, size) => {
			fileSizes.push(size);
		});
	});

	return fileSizes;
};
