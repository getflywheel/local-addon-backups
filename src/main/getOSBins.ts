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

	const binDirPath = path.join(__dirname, '..', '..', 'vendor', process.platform);

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
