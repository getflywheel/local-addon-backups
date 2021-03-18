import 'jest-extended';
import { parseSnapshotIDFromStdOut } from './backupService';

const uuid = '0f5587ff-1d05-44cf-890c-c4ac6e3b3b22';
const output = [
	'La di da di da di da....',
	'hello!',
	'{\"key\": \"hello\" }',
	`{\"snapshot_id\": \"${uuid}\" }`,
].join('\n');

describe('parseSnapshotIDFromStdOut', () => {
	it('splits a string on newlines, finds the line with the snapshot id and marshals it to a JS object', () => {
		const snapshotID = parseSnapshotIDFromStdOut(output);

		expect(snapshotID).toEqual(uuid);
	});
});
