import fs from 'fs-extra';
import path from 'path';

interface Bins {
	restic: string;
	rclone: string;
}

export default function (): Bins {
	let resticBinName;
	let rcloneBinName;

	switch (process.platform) {
		case 'win32':
			resticBinName = 'restic.exe';
			rcloneBinName = 'rclone.exe';
			break;
		default:
			resticBinName = 'restic';
			rcloneBinName = 'rclone';
			break;
	}

	let binDirPath = path.join(__dirname, '..', 'vendor', process.platform);

	/**
	 * This ensures that the vendor dir can be found if the main thread code is compiled with tsc directly
	 * whereas the previous value is the correct path if the code has been compiled with webpack
	 *
	 * @todo find a more elegant way to do this (most likey via a smarter webpack config)
	 */
	if (!fs.existsSync(binDirPath)) {
		binDirPath = path.join(__dirname, '..', '..', 'vendor', process.platform);
	}

	const bins = {
		restic: path.join(binDirPath, resticBinName),
		rclone: path.join(binDirPath, rcloneBinName),
	};

	if (!fs.existsSync(bins.restic)) {
		throw new Error(`Restic binary not found at: ${bins.restic}`);
	}

	if (!fs.existsSync(bins.rclone)) {
		throw new Error(`Rclone binary not found at: ${bins.rclone}`);
	}

	return bins;
}
