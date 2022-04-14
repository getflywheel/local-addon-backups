import React from 'react';
import type { Site } from '@getflywheel/local';
import { Button, Tooltip } from '@getflywheel/local-components';
import { getSiteStatus } from '../../helpers/getSiteStatus';
import { actions, store, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import { createModal } from '../createModal';
import { BackupContents } from '../modals/BackupContents';
import { selectSnapshotsForActiveSitePlusExtra } from '../../store/snapshotsSlice';

interface Props {
	offline: boolean,
	site: Site;
}

export const StartBackupButton = (props: Props) => {
	const { offline, site } = props;
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);
	const hasSnapshots = useStoreSelector(selectSnapshotsForActiveSitePlusExtra)?.length > 0;
	const { backupIsRunning } = useStoreSelector((state) => state.director);
	const backupSite = (description: string) => {
		store.dispatch(actions.backupSite({
			description,
			providerId: activeSiteProvider.id,
			siteId: site.id,
			siteName: site.name,
		}));
	};

	const siteStatus = getSiteStatus(site);

	let tooltipContent = offline ? <>Check internet connection</> : <>Please start site to create a backup</>;

	if (!activeSiteProvider) {
		tooltipContent = <>Please select a provider for your backup</>;
	}

	if (backupIsRunning) {
		tooltipContent = <>Another backup or restore is already in progress</>;
	}

	const buttonDisabled = offline || !activeSiteProvider || backupIsRunning || siteStatus !== 'running';
	const containerProps = buttonDisabled ? {
		element: (
			<Tooltip
				content={tooltipContent}
				popperOffsetModifier={{ offset: [-55, 10] }}
				showDelay={300}
			/>
		),
	} : {};

	return (
		<Button
			container={containerProps}
			disabled={buttonDisabled}
			onClick={() => createModal(
				() => (
					<BackupContents
						submitAction={backupSite}
						site={site}
						hasSnapshots={hasSnapshots}
					/>
				),
			)}
			privateOptions={{
				padding: 'm',
			}}
		>
			Back up site
		</Button>
	);
};
