const { execSync, exec } = require('child_process');
const path = require('path');


/**
 * rclone supports listing all objects in a remote in json format with the lsjson command
 * Search for lsjson here: https://rclone.org/commands/rclone_lsd/
 *
 * Sample output (from google drive) for this looks like:
 * [
 *		{"Path":"test","Name":"test","Size":-1,"MimeType":"inode/directory","ModTime":"2021-01-22T16:19:23.393Z","IsDir":true,"ID":"<string>"},
 *		{"Path":"test/restic-repo","Name":"restic-repo","Size":-1,"MimeType":"inode/directory","ModTime":"2021-01-22T16:58:43.947Z","IsDir":true,"ID":"<string>"},
 *		{"Path":"test/icon.svg","Name":"icon.svg","Size":1824,"MimeType":"image/svg+xml","ModTime":"2020-10-20T16:26:19.000Z","IsDir":false,"ID":"<string>"},
 *	]
 *
 * This means that we can easily query for all objects in a remote and filter out files or directories as needed
 *
 * You can also recursive traverse the objects in a remote with the --recursive flag
 *
 * Use the --fast-list flag if possible as it batches request bodies and is significantly faster than without
 *
 *
 * Variable shit to track
 *
 * --------------------------------------
 * site
 * --------------------------------------
 * - connected providers
 * - repo for each connected provider
 * - snapshots for each repo
 * - use rclone to check that repo actually exists on the current provider (in case Hub is out of sync)
 * - init restic repo with rclone for a provider and site/repo
 * -
 */

const listObject = () => {
	const repoName = 'new';
	const result = execSync(
		`rclone lsjson nested:${repoName} --use-json-log --fast-list`,
	);

	console.log(result.toString());
};

// listObject();

const listAllObjects = () => {
	const result = execSync(
		'rclone lsjson test0: --use-json-log --fast-list',

	);

	console.log(result.toString());
};

const objectFilter = (isDir) => () => JSON.parse(listAllObjects()).filter((o) => o.isDir === isDir);

const listDirectories = objectFilter(true);

const listFiles = objectFilter(false);

/**
 * Sample output for initing a restic repo
 *
 * -------------------------------------------------------------------------------------------------
 * If repo already exists (stderr)
 * -------------------------------------------------------------------------------------------------
 *
 * Fatal: create repository at rclone:nested:new/a failed: Fatal: config file already exists
 *
 * -------------------------------------------------------------------------------------------------
 * Success creating repo (from stdout):
 * -------------------------------------------------------------------------------------------------
 *
 *	created restic repository 1e99acdc9e at rclone:nested:new/b
 *
 *	Please note that knowledge of your password is required to access
 *	the repository. Losing your password means that your data is
 *	irrecoverably lost.
 *
 * @returns void
 */


const initResticRepo = () => {
	const pw = 'admin';

	const proc = exec(
		`restic --repo rclone:nested:site1 init --json --password-command "echo \'${pw}\'"`,
		(error, stdout, stderr) => {
			console.log('error output', error);
			console.log('stdout', stdout);
			console.log('stderr', stderr);
		},
	);

	proc.stdout.on('data', (data) => {
		console.log('data:', data);
	});

	proc.stderr.on('data', (data) => {
		console.log('error:', data);
	});
};

// initResticRepo();

const verifyRepo = () => {
	const flags = [
		'--drive-token "{\"access_token\":\"ya29.a0AfH6SMBPtUjGCPTO_wKEMJEwFJ8BfvhaDfo1NyaLKjOeYlRFKDEOsRyIHyj0KARkxHWHmAva-2lIBHxARtgIRXMkjECH4RCqOzPR8IvWhdPUaPIkGfDCSjjckQr9MVL31r3Ij_HmYPhVN_ceIXjTQlh1XuS_Qm9IaLYTaz4Se5QM\",\"token_type\":\"Bearer\",\"refresh_token\":null,\"expiry\":\"2021-01-26T18:03:05.000000Z\"}"',

	];

	const bin = path.join(__dirname, '..', '..', 'vendor', 'darwin', 'rclone');

	console.log(execSync(
		`${bin} ${flags.join(' ')}`,
	).toString());
};


/**
 * - Create an rclone config (or use the equivalent in flags) for each remote provider. An example might look like:
 *
 * {
 *   "localbackups": {
 *       "client_id": <string>,
 *       "client_secret": <string>,
 *       "scope": "drive",
 *       "token": "{\"access_token\":\fake-token",\"token_type\":\"Bearer\",\"refresh_token\":\"fake-refresh-token\"",\"expiry\":\"2021-01-22T16:06:54.026253-06:00\"}",
 *       "type": "drive"
 *   }
 * }
 *
 * - Get the client_id and client_secret from Hub
 * - We'll also need to get root_folder_id for drive or alternatively just use the known folder hierchary that
 * we chose to build out commands to list only things in those locations
 */
