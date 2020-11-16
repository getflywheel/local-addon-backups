import React from 'react';
import { TextButton, TableListRow } from '@getflywheel/local-components';
import { ipcRenderer } from 'electron';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const { hooks } = context;

	hooks.addContent('siteInfoUtilities', (site) => (
		<TableListRow key="addon-backups" label="Backup">
			<TextButton
				style={{ paddingLeft: 0 }}
				onClick={() => {
					ipcRenderer.send('start-site-backup', site.id);
				}}
			>
				Create Snapshot Now
			</TextButton>

			<p>
				<small>Take a snapshot of the current project and upload it to the cloud.</small>
			</p>
		</TableListRow>
	));
}
