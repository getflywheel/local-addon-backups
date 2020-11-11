import * as LocalMain from '@getflywheel/local/main';
import React from 'react';
import fs from 'fs-extra';
import path from 'path';
import { TextButton, TableListRow } from '@getflywheel/local-components';
import { ipcRenderer } from 'electron';

const { localLogger } = LocalMain.getServiceContainer().cradle;
const packageJSON = fs.readJsonSync(path.join(__dirname, '../../package.json'));

const logger = localLogger.child({
	thread: 'main',
	class: 'AddonImageOptimizer',
	addonName: packageJSON.name,
	addonVersion: packageJSON.version,
});

export default function (context) {
	const { hooks } = context;

	hooks.addContent('siteInfoUtilities', (site) => {
		logger.info('site', site);

		return (
			<TableListRow key="addon-backups" label="Backup">
				<TextButton
					style={{ paddingLeft: 0 }}
					onClick={(event) => {
						ipcRenderer.send('start-site-backup', site.id);
					}}
				>
					Create Snapshot Now
				</TextButton>

				<p>
					<small>Take a snapshot of the current project and upload it to the cloud.</small>
				</p>
			</TableListRow>
		);
	});
}
