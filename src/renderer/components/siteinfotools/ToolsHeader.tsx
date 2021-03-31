import React from 'react';
import styles from './ToolsHeader.scss';
import { ProviderDropdown } from './ProviderDropdown';
import { PrimaryButton } from '@getflywheel/local-components';
import { useStoreSelector, selectors } from '../../store/store';
import { launchBrowserToHubBackups } from '../../helpers/launchBrowser';

export const ToolsHeader = () => {
	const enabledProviders = useStoreSelector(selectors.enabledProviders);

	return (
		<div className={styles.ToolsHeaders}>
			<ProviderDropdown />
			{enabledProviders.length
				? (
					<PrimaryButton
						onClick={() => alert('backup now wireup')}
						privateOptions={{
							padding: 'm',
						}}
					>
						Back Up Site
					</PrimaryButton>
				)
				: (
					<PrimaryButton
						onClick={() => launchBrowserToHubBackups()}
						privateOptions={{
							padding: 'm',
						}}
					>
						Connect Provider
					</PrimaryButton>
				)
			}
		</div>
	);
}
