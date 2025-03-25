import 'jest-extended';

import fs from 'fs';
import path from 'path';

describe('Bundled binaries', () => {
	it('includes rclone for supported os\'s', () => {
		const vendorDir = path.join(__dirname, '..', '..', 'vendor');

		expect(fs.existsSync(path.join(vendorDir, 'darwin', 'rclone'))).toBe(true);
		expect(fs.existsSync(path.join(vendorDir, 'linux', 'rclone'))).toBe(true);
		expect(fs.existsSync(path.join(vendorDir, 'win32', 'rclone.exe'))).toBe(true);
		expect(fs.existsSync(path.join(vendorDir, 'win64', 'rclone.exe'))).toBe(true);
	});

	it('includes restic for supported os\'s', () => {
		const vendorDir = path.join(__dirname, '..', '..', 'vendor');

		expect(fs.existsSync(path.join(vendorDir, 'darwin', 'restic'))).toBe(true);
		expect(fs.existsSync(path.join(vendorDir, 'linux', 'restic'))).toBe(true);
		expect(fs.existsSync(path.join(vendorDir, 'win32', 'restic.exe'))).toBe(true);
		expect(fs.existsSync(path.join(vendorDir, 'win64', 'restic.exe'))).toBe(true);
	});
});
