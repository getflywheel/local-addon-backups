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
import { LOCAL_ROUTES } from './constants';

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
				route.path = LOCAL_ROUTES.ADD_SITE_CREATE_NEW;
			}
		});

		routes.push(
			{ key: 'add-site-choose', path: `${path}/`, component: ChooseCreateSiteHOC },
			{ key: 'add-site-select-site-backup', path: LOCAL_ROUTES.ADD_SITE_BACKUP_SITE, component: SelectSiteBackupHOC },
			{ key: 'add-site-select-snapshot', path: LOCAL_ROUTES.ADD_SITE_BACKUP_SNAPSHOT, component: SelectSnapshotHOC },
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
				LocalRenderer.sendIPCEvent('goToRoute', LOCAL_ROUTES.ADD_SITE_BACKUP_SNAPSHOT);
			};

			newSiteEnvironmentProps.onContinue = continueCreateSite;
			newSiteEnvironmentProps.onGoBack = onGoBack;
			newSiteEnvironmentProps.buttonText = 'Restore Site';

			return newSiteEnvironmentProps;
		}

		newSiteEnvironmentProps.onGoBack = () => {
			LocalRenderer.sendIPCEvent('goToRoute', LOCAL_ROUTES.ADD_SITE_CREATE_NEW);
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
					done={localHistory.location.pathname !== LOCAL_ROUTES.ADD_SITE_BACKUP_SITE}
					active={localHistory.location.pathname === LOCAL_ROUTES.ADD_SITE_BACKUP_SITE}
				>
					Select Site
				</Step>
				<Step
					key={'choose-snapshot'}
					number={2}
					done={localHistory.location.pathname === LOCAL_ROUTES.ADD_SITE_ENVIRONMENT}
					active={localHistory.location.pathname === LOCAL_ROUTES.ADD_SITE_BACKUP_SNAPSHOT}
				>
					Select Backup
				</Step>
				<Step
					key={'choose-environment'}
					number={3}
					done={false}
					active={localHistory.location.pathname === LOCAL_ROUTES.ADD_SITE_ENVIRONMENT}
				>
					Setup Environment
				</Step>
			</Stepper>
		);

		switch (localHistory.location.pathname) {
			case LOCAL_ROUTES.ADD_SITE_START:
				breadcrumbsData.defaultStepper = () => null;
				break;
			case LOCAL_ROUTES.ADD_SITE_BACKUP_SITE:
			case LOCAL_ROUTES.ADD_SITE_BACKUP_SNAPSHOT:
				breadcrumbsData.defaultStepper = () => cloudBackupStepper();
				break;
		}

		if (
			siteSettings.cloudBackupMeta?.createdFromCloudBackup
			&& localHistory.location.pathname === LOCAL_ROUTES.ADD_SITE_ENVIRONMENT
		) {
			breadcrumbsData.defaultStepper = () => cloudBackupStepper();
		}

		return breadcrumbsData;
	});

	hooks.addFilter('AddSiteIndexJS:RenderCloseButton', (closeButtonData) => () => (
		<CloseButtonHOC
			onClose={closeButtonData.onCloseButton()}
		/>
	));

	hooks.addContent(
		'NewSiteSite_AfterContent',
		() => {
			const goBack = () => {
				LocalRenderer.sendIPCEvent('goToRoute', LOCAL_ROUTES.ADD_SITE_START);
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
