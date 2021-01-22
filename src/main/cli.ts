import path from 'path';
import { exec } from 'child_process';
import getOSBins from './getOSBins';

const bins = getOSBins();

export async function executeBinary (binName: string, args: string[]): Promise<void> {
	const bin = bins[binName];

	const command = `bin ${args.join(' ')}`
	const result = exec(command);

	console.log(result);
}
