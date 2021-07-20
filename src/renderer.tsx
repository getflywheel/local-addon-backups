import React from 'react';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import { RestoreStates, BackupStates } from './types';
import { store } from './renderer/store/store';
import SiteInfoToolsSection from './renderer/components/siteinfotools/SiteInfoToolsSection';
import { setupListeners } from './renderer/helpers/setupListeners';
import { client } from './renderer/localClient/localGraphQLClient';
import { ChooseCreateSite } from './renderer/components/multimachinebackups/ChooseCreateSite';
import { SelectSiteBackup } from './renderer/components/multimachinebackups/SelectSiteBackup';
import { SelectSnapshot } from './renderer/components/multimachinebackups/SelectSnapshot';

setupListeners();

const withApolloProvider = (Component) => (props) => (
	<ApolloProvider client={client}>
		<Component {...props} />
	</ApolloProvider>
);

const withStoreProvider = (Component) => (props) => (
	<Provider store={store}>
		<Component {...props} />
	</Provider>
);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const { hooks } = context;
	const SiteInfoToolsSectionHOC = withApolloProvider(withStoreProvider(SiteInfoToolsSection));

	hooks.addFilter('siteInfoToolsItem', (items) => {
		items.push({
			path: '/localBackups',
			menuItem: 'Cloud Backups',
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

	hooks.addFilter('AddSiteUserFlow:RoutesArray', (routes, path) => {
		routes.forEach((route) => {
			if (route.path === `${path}/`) {
				route.path = `${path}/add`;
			}
		});
		console.log(routes);

		routes.push(
			{ key: 'add-site-choose', path: `${path}/`, component: ChooseCreateSite },
			{ key: 'add-site-select-site-backup', path: `${path}/select-site-backup`, component: SelectSiteBackup },
			{ key: 'add-site-select-snapshot', path: `${path}/select-snapshot`, component: SelectSnapshot },
		);

		return routes;
	});
}
