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

	// add new routes and components to Local core
	hooks.addFilter('AddSiteIndexJS:RoutesArray', (routes, path) => {
		const cloudBackupRoutes = [
			{ key: 'add-site-choose', path: `${path}/`, component: ChooseCreateSiteHOC },
			{ key: 'add-site-select-site-backup', path: LOCAL_ROUTES.ADD_SITE_BACKUP_SITE, component: SelectSiteBackupHOC },
			{ key: 'add-site-select-snapshot', path: LOCAL_ROUTES.ADD_SITE_BACKUP_SNAPSHOT, component: SelectSnapshotHOC },
		];

		routes.forEach((route) => {
			if (route.path === `${path}/`) {
				cloudBackupRoutes.push(
					{ key: 'add-site-add', path: LOCAL_ROUTES.ADD_SITE_CREATE_NEW, component: route.component },
				);
			}
			cloudBackupRoutes.push(route);
		});

		return cloudBackupRoutes;
	});

	// optionally modify NewSiteEnvironment component functionality in Local core
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

			return {
				...newSiteEnvironmentProps,
				onContinue: continueCreateSite,
				onGoBack: onGoBack,
				buttonText: 'Restore Site',
			};
		}

		return {
			...newSiteEnvironmentProps,
			onGoBack: () => LocalRenderer.sendIPCEvent('goToRoute', LOCAL_ROUTES.ADD_SITE_CREATE_NEW),
		};
	});

	// add a new breadcrumbs stepper to the Add Site user flow
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
				return {
					...breadcrumbsData,
					defaultStepper: () => null,
				};
			case LOCAL_ROUTES.ADD_SITE_BACKUP_SITE:
			case LOCAL_ROUTES.ADD_SITE_BACKUP_SNAPSHOT:
				return {
					...breadcrumbsData,
					defaultStepper: () => cloudBackupStepper(),
				};
		}

		if (
			siteSettings.cloudBackupMeta?.createdFromCloudBackup
			&& localHistory.location.pathname === LOCAL_ROUTES.ADD_SITE_ENVIRONMENT
		) {
			return {
				...breadcrumbsData,
				defaultStepper: () => cloudBackupStepper(),
			};
		}

		return {
			...breadcrumbsData,
		};
	});

	// modify the "close button" functionality for the Add Site user flow
	hooks.addFilter('AddSiteIndexJS:RenderCloseButton', (closeButtonData) => (
		{
			...closeButtonData,
			closeButton: () => (
				<CloseButtonHOC
					onClose={closeButtonData.onCloseButton()}
				/>
			),
		}),
	);

	// add a "go back" button to the first step in the default Add Site user flow
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
