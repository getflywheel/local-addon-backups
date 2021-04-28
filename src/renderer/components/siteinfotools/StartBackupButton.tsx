import React from 'react';
import type { Site } from '@getflywheel/local';
import { PrimaryButton, Tooltip } from '@getflywheel/local-components';
import { getSiteStatus } from '../../helpers/getSiteStatus';
import { actions, store, useStoreSelector } from '../../store/store';
import { selectors } from '../../store/selectors';
import { createModal } from '../createModal';
import { BackupContents } from '../modals/BackupContents';

interface Props {
	site: Site;
}

export const StartBackupButton = (props: Props) => {
	const { site } = props;
	const activeSiteProvider = useStoreSelector(selectors.selectActiveProvider);
	const { snapshots } = useStoreSelector((state) => state.activeSite);
	const { backupIsRunning } = useStoreSelector((state) => state.director);
	const backupSite = (description: string) => {
		store.dispatch(actions.backupSite({
			description,
			siteId: site.id,
			siteName: site.name,
		}));
	};

	const siteStatus = getSiteStatus(site);

	let tooltipContent = <>Please start site to create a backup</>;

	if (!activeSiteProvider) {
		tooltipContent = <>Please select a provider for your backup</>;
	}

	if (backupIsRunning) {
		tooltipContent = <>Another backup or restore is already in progress</>;
	}

	const buttonDisabled = !activeSiteProvider || backupIsRunning || siteStatus !== 'running';

	if (buttonDisabled) {
		return (
			<Tooltip
				content={tooltipContent}
				popperOffsetModifier={{ offset: [-55, 10] }}
				showDelay={300}
			>
				<PrimaryButton
					disabled={buttonDisabled}
					onClick={() => createModal(
						() => (
							<BackupContents
								submitAction={backupSite}
								site={site}
								snapshots={snapshots}
							/>
						),
					)}
					privateOptions={{
						padding: 'm',
					}}
				>
					Back Up Site
				</PrimaryButton>
			</Tooltip>
		);
	}

	return (
		<PrimaryButton
			disabled={buttonDisabled}
			onClick={() => createModal(
				() => (
					<BackupContents
						submitAction={backupSite}
						site={site}
						snapshots={snapshots}
					/>
				),
			)}
			privateOptions={{
				padding: 'm',
			}}
		>
			Back Up Site
		</PrimaryButton>
	);
};
