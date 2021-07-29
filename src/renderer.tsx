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
import { CloseButtonWithStore } from './renderer/components/multimachinebackups/CloseButtonWithStore';
import * as LocalRenderer from '@getflywheel/local/renderer';
import {
	Stepper,
	Step,
	TextButton,
} from '@getflywheel/local-components';

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
	const ChooseCreateSiteHOC = withApolloProvider(withStoreProvider(ChooseCreateSite));
	const SelectSiteBackupHOC = withApolloProvider(withStoreProvider(SelectSiteBackup));
	const SelectSnapshotHOC = withApolloProvider(withStoreProvider(SelectSnapshot));
	const CloseButtonHOC = withStoreProvider(CloseButtonWithStore);

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

	hooks.addFilter('AddSiteIndexJS:RoutesArray', (routes, path) => {
		routes.forEach((route) => {
			if (route.path === `${path}/`) {
				route.path = `${path}/add`;
			}
		});

		routes.push(
			{ key: 'add-site-choose', path: `${path}/`, component: ChooseCreateSiteHOC },
			{ key: 'add-site-select-site-backup', path: `${path}/select-site-backup`, component: SelectSiteBackupHOC },
			{ key: 'add-site-select-snapshot', path: `${path}/select-snapshot`, component: SelectSnapshotHOC },
		);

		return routes;
	});

	hooks.addFilter('AddSiteIndexJS:NewSiteEnvironment', (newSiteEnvironmentProps) => {
		if (newSiteEnvironmentProps.siteSettings.cloudBackupMeta?.createdFromCloudBackup) {
			const continueCreateSite = () => {
				LocalRenderer.sendIPCEvent('addSite', {
					newSiteInfo: newSiteEnvironmentProps.siteSettings,
					goToSite: true,
					installWP: false,
				});
			};

			const onGoBack = () => {
				LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/select-snapshot');
			};

			newSiteEnvironmentProps.onContinue = continueCreateSite;
			newSiteEnvironmentProps.onGoBack = onGoBack;
			newSiteEnvironmentProps.buttonText = 'Restore Site';

			return newSiteEnvironmentProps;
		}

		newSiteEnvironmentProps.onGoBack = () => {
			LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site/add');
		};

		return newSiteEnvironmentProps;
	});

	hooks.addFilter('AddSiteIndexJS:RenderBreadcrumbs', (breadcrumbsData) => {
		const { localHistory, siteSettings } = breadcrumbsData;

		const cloudBackupStepper = () => (
			<Stepper>
				<Step
					key={'choose-site'}
					number={1}
					done={localHistory.location.pathname !== '/main/add-site/'}
					active={localHistory.location.pathname === '/main/add-site/'}
				>
					Select Site
				</Step>
				<Step
					key={'choose-snapshot'}
					number={2}
					done={localHistory.location.pathname === '/main/add-site/environment'}
					active={localHistory.location.pathname === '/main/add-site/select-snapshot'}
				>
					Select Backup
				</Step>
				<Step
					key={'choose-environment'}
					number={3}
					done={false}
					active={localHistory.location.pathname === '/main/add-site/environment'}
				>
					Setup Environment
				</Step>
			</Stepper>
		);

		switch (localHistory.location.pathname) {
			case '/main/add-site':
				breadcrumbsData.defaultStepper = () => null;
				break;
			case '/main/add-site/select-site-backup':
				breadcrumbsData.defaultStepper = () => cloudBackupStepper();
				break;
			case '/main/add-site/select-snapshot':
				breadcrumbsData.defaultStepper = () => cloudBackupStepper();
				break;
		}

		if (
			siteSettings.cloudBackupMeta?.createdFromCloudBackup
			&& localHistory.location.pathname === '/main/add-site/environment'
		) {
			breadcrumbsData.defaultStepper = () => cloudBackupStepper();
		}

		return breadcrumbsData;
	});

	hooks.addFilter('AddSiteIndexJS:RenderCloseButton', (closeButtonData) => {
		const closeButtonModified = () => (
			<CloseButtonHOC
				onClose={closeButtonData.onCloseButton()}
			/>
		);

		closeButtonData.closeButton = () => closeButtonModified();

		return closeButtonData;
	});

	hooks.addContent(
		'NewSiteSite_AfterContent',
		() => {
			const goBack = () => {
				LocalRenderer.sendIPCEvent('goToRoute', '/main/add-site');
			};
			return (
				<TextButton
					className="GoBack"
					onClick={goBack}
				>
					Go Back
				</TextButton>
			);
		},
	);
}
