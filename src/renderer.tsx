import React, { useState } from 'react';
import { TextButton, TableListRow, FlySelect } from '@getflywheel/local-components';
import { ipcAsync } from '@getflywheel/local/renderer';
import type { SiteJSON } from '@getflywheel/local';
import { startCase } from 'lodash';
import { Providers } from './types';

const titlize = (a: string) => startCase(a.toLowerCase());

interface RowProps<T> {
	onClick: (a: T, provider: Providers) => void;
	buttonText: string;
	description?: string;
}

const Row = (props: RowProps<void>) => (
	<div>
		<TextButton
			style={{ paddingLeft: 0 }}
			onClick={props.onClick}
		>
			{props.buttonText}
		</TextButton>
		{props.description ? (
			<p>
				<small>{props.description}</small>
			</p>
		) : null}
	</div>
);

const MainComponent = (props: { rows: RowProps<SiteJSON>[], site: SiteJSON }) => {
	const { rows, site } = props;
	const [provider, setProvider] = useState(Providers.Google);
	return (
		<TableListRow key="addon-backups" label="Backup">
			<FlySelect
				/* @ts-ignore */
				options={[...Object.values(Providers)].map(titlize)}
				onChange={(selection) => setProvider(selection.toLowerCase())}
				value={titlize(provider)}
			/>
			<p>
				<small>Select which provider you would like to backup to</small>
			</p>
			{rows.map(({ onClick, buttonText, description }, i) => (
				<Row
					key={`buttonText-${i}`}
					onClick={() => onClick(site, provider)}
					buttonText={buttonText}
					description={description}
				/>
			))}
		</TableListRow>
	);
};

const expandTilde = (path: string) => path.replace(/^~/, '/home/matt');

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const { hooks } = context;

	const rows = [
		{
			onClick: async (site, provider) => {
				const result = await ipcAsync('start-site-backup', site.id, provider);
				console.log('result from backup..........', result);
			},
			buttonText: 'Create Snapshot Now',
			description: 'Take a snapshot of the current project and upload it to the cloud.',
		},
		{
			onClick: async (site, provider) => {
				const snapshots = await ipcAsync('list-site-snapshots', site.id, provider);
				console.log('snapshots...', snapshots);
			},
			buttonText: 'List Site Snapshots',
			description: 'Query for all site backups (this might take a few seconds).',
		},
		{
			onClick: async (site, provider) => {
				console.log(
					await ipcAsync('list-repos', site.id, provider),
				);
			},
			buttonText: 'List Repos',
			description: 'Lists repos for all sites',
		},
		{
			onClick: async (site, provider) => {
				console.log(site)
				const { localBackupRepoID } = site;
				const bin = 'restic';
				const flags = [
					// '--fast-list',
					// '--use-json-log',
					'--json',
				];
				// const cmd = `backup --repo rclone:google:${localBackupRepoID} ${flags.join(' ')} \"${expandTilde(site.path)}\"`;
				const rcloneArgsForRestic = `-o rclone.args="serve restic --stdio --verbose"`;
				/**
				 * the double colon is an attempt at using the rclone :backend: syntax to dynamically use a backend without a named
				 * config in the rclone config. The value of :backend: should be whatever would be set in the type field in the rclone config
				 */
				const cmd = `${rcloneArgsForRestic} --repo rclone::drive:${localBackupRepoID} ${flags.join(' ')} init`;

				console.log(
					await ipcAsync('do-arbitrary-shit', site.id, provider, bin, cmd),
				);

			},
			buttonText: 'Run the command',
			description: 'runs whatever command is defined on the front end for my ease',
		},
	];

	hooks.addContent('SiteInfoUtilities_TableList', (site) => (
		<MainComponent
			site={site}
			rows={rows}
		/>
	));
}
