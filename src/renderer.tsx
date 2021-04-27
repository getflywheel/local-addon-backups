import React from 'react';
import { Provider } from 'react-redux';
import { RestoreStates, BackupStates } from './types';
import { store } from './renderer/store/store';
import SiteInfoToolsSection from './renderer/components/siteinfotools/SiteInfoToolsSection';
import { setupListeners } from './renderer/helpers/setupListeners';

setupListeners();

const withStoreProvider = (Component) => (props) => (
	<Provider store={store}>
		<Component {...props} />
	</Provider>
);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const { hooks } = context;
	const SiteInfoToolsSectionHOC = withStoreProvider(SiteInfoToolsSection);

	hooks.addFilter('siteInfoToolsItem', (items) => {
		items.push({
			path: '/localBackups',
			menuItem: 'Backups',
			render: ({ site }) => (
				<SiteInfoToolsSectionHOC site={site} />
			),
		});

		return items;
	});

	// todo - refactor to make use of this filter for backup statuses
	hooks.addFilter('allowedSiteOverlayStatuses', (statuses: string[]) => {
		statuses.push(...Object.values(RestoreStates));
		statuses.push(BackupStates.creatingDatabaseSnapshot);
		return statuses;
	});
}
