import { getFilteredSiteFiles } from '../../../helpers/ignoreFilesPattern';
import getFolderSize from 'get-folder-size';
import type { Site } from '@getflywheel/local';

export const fetchSiteSizeInMB = async (site: Site): Promise<number> => {
	const filesToEstimate = getFilteredSiteFiles(site);
	let siteSize = 0;

	await Promise.all(filesToEstimate.map(async (dir) => {
		const folderSize = await getFolderSize.loose(dir);
		const folderSizeInMB = (folderSize / 1024 / 1024);
		siteSize += folderSizeInMB;
	}));

	return siteSize;
};
