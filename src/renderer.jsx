import React from 'react';
import { TextButton, TableListRow } from '@getflywheel/local-components';
import { ipcRenderer } from 'electron';

export default function (context) {
	const { hooks } = context;

	hooks.addContent('siteInfoUtilities', (site) => {
		return (
			<TableListRow key="addon-backups" label="Backup">
				<TextButton
					style={{paddingLeft: 0}}
					onClick={(event) => {
						ipcRenderer.send('start-site-backup', site.id);

						event.target.setAttribute('disabled', 'true');
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
