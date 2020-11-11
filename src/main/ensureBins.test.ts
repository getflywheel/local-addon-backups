import 'jest-extended';

import fs from 'fs';
import path from 'path';

describe('Bundled binaries', () => {
	it('includes rclone for supported os\'s', () => {
		const vendorDir = path.join(__dirname, '..', '..', 'vendor');

		expect(fs.existsSync(path.join(vendorDir, 'darwin', 'rclone'))).toBeTrue();
		expect(fs.existsSync(path.join(vendorDir, 'linux', 'rclone'))).toBeTrue();
		expect(fs.existsSync(path.join(vendorDir, 'win32', 'rclone.exe'))).toBeTrue();
		expect(fs.existsSync(path.join(vendorDir, 'win64', 'rclone.exe'))).toBeTrue();
	});

	it('includes restic for supported os\'s', () => {
		const vendorDir = path.join(__dirname, '..', '..', 'vendor');

		expect(fs.existsSync(path.join(vendorDir, 'darwin', 'restic'))).toBeTrue();
		expect(fs.existsSync(path.join(vendorDir, 'linux', 'restic'))).toBeTrue();
		expect(fs.existsSync(path.join(vendorDir, 'win32', 'restic.exe'))).toBeTrue();
		expect(fs.existsSync(path.join(vendorDir, 'win64', 'restic.exe'))).toBeTrue();
	});
});
