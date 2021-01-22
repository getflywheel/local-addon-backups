const { execSync, exec } = require('child_process');


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
 *
 */


const listAllObjects = () => {
	const result = execSync(
		'rclone lsjson nested: --use-json-log',
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
		`restic --repo rclone:nested:new/b init --json --password-command "echo \'${pw}\'"`,
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

initResticRepo();
