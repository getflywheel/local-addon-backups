import React from 'react';
import { Provider } from 'react-redux';
import { ApolloProvider } from '@apollo/client';
import { RestoreStates, BackupStates } from './types';
import { store, actions } from './renderer/store/store';
import SiteInfoToolsSection from './renderer/components/siteinfotools/SiteInfoToolsSection';
import { setupListeners } from './renderer/helpers/setupListeners';
import { client } from './renderer/localClient/localGraphQLClient';
import { SelectSiteBackup } from './renderer/components/multimachinebackups/SelectSiteBackup';
import { SelectSnapshot } from './renderer/components/multimachinebackups/SelectSnapshot';
import * as LocalRenderer from '@getflywheel/local/renderer';
import { Stepper, Step } from '@getflywheel/local-components';
import { LOCAL_ROUTES } from './constants';
import PromoBanner from './renderer/components/PromoBanner';
import createSiteRadioOption from './renderer/components/createSiteRadioOption';
import { configure } from 'mobx';

configure({
	enforceActions: 'observed',
	isolateGlobalState: true,
});

setupListeners();

const withApolloProvider = (Component) => (props) =>
	(
		<ApolloProvider client={client}>
			<Component {...props} />
		</ApolloProvider>
	);

const withStoreProvider = (Component) => (props) =>
	(
		<Provider store={store}>
			<Component {...props} />
		</Provider>
	);

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export default function (context): void {
	const { hooks } = context;
	const SiteInfoToolsSectionHOC = withApolloProvider(withStoreProvider(SiteInfoToolsSection));
	const SelectSiteBackupHOC = withApolloProvider(withStoreProvider(SelectSiteBackup));
	const SelectSnapshotHOC = withApolloProvider(withStoreProvider(SelectSnapshot));

	hooks.addFilter('siteInfoToolsItem', (items) => {
		const cloudBackupItems = [
			{
				path: '/localBackups',
				menuItem: 'Cloud Backups',
				render: ({ site }) => <SiteInfoToolsSectionHOC site={site} />,
			},
		];

		items.forEach((item) => {
			cloudBackupItems.push(item);
		});

		return cloudBackupItems;
	});

	hooks.addFilter('allowedSiteOverlayStatuses', (statuses: string[]) => {
		const cloudBackupStatuses: string[] = [...Object.values(RestoreStates), BackupStates.creatingDatabaseSnapshot];

		statuses.forEach((status) => {
			cloudBackupStatuses.push(status);
		});

		return cloudBackupStatuses;
	});

	/**
	 * Add CloudBackups as an option when creating a new site
	 *
	 * The option object's key is used as the RadioBlock value and
	 * needs to be the route that will be navigated to by the "Continue"
	 * button.
	 */
	hooks.addFilter('CreateSite:RadioOptions', (options) => {
		return {
			...options,
			'add-site/select-site-backup': createSiteRadioOption(),
		};
	});

	/*
	 *  Add new routes and components to Local core
	 *
	 * Note: This doesn't match exactly with the new CreateSite
	 * paradigm, but will be addressed with upcoming work when refactoring
	 * the AddSite flow.
	 */
	hooks.addFilter('AddSiteIndexJS:RoutesArray', (routes, path) => {
		const cloudBackupRoutes = [
			{
				key: 'add-site-select-site-backup',
				path: LOCAL_ROUTES.ADD_SITE_BACKUP_SITE,
				component: SelectSiteBackupHOC,
			},
			{
				key: 'add-site-select-snapshot',
				path: LOCAL_ROUTES.ADD_SITE_BACKUP_SNAPSHOT,
				component: SelectSnapshotHOC,
			},
		];
		routes.forEach((route) => {
			if (route.path === `${path}/`) {
				cloudBackupRoutes.push({
					key: 'add-site-add',
					path: LOCAL_ROUTES.ADD_SITE_CREATE_NEW,
					component: route.component,
				});
			}
			cloudBackupRoutes.push(route);
		});

		return cloudBackupRoutes;
	});

	hooks.addContent('CreateSite_Messages', () => <PromoBanner />);

	// optionally modify NewSiteEnvironment component functionality in Local core
	hooks.addFilter('AddSiteIndexJS:NewSiteEnvironment', (newSiteEnvironmentProps) => {
		if (newSiteEnvironmentProps.siteSettings.cloudBackupMeta?.createdFromCloudBackup) {
			const continueCreateSite = () => {
				LocalRenderer.sendIPCEvent('addSite', {
					newSiteInfo: newSiteEnvironmentProps.siteSettings,
					goToSite: true,
					installWP: false,
				});

				// Reset the user selected options from the add site flow.
				store.dispatch(actions.resetMultiMachineRestoreState());
			};

			const onGoBack = () => {
				newSiteEnvironmentProps.history.goBack();
			};

			return {
				...newSiteEnvironmentProps,
				onContinue: continueCreateSite,
				onGoBack,
				buttonText: 'Add Site',
			};
		}

		return {
			...newSiteEnvironmentProps,
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
					Select Site and Name
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
					Set Up Environment
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
			siteSettings.cloudBackupMeta?.createdFromCloudBackup &&
			localHistory.location.pathname === LOCAL_ROUTES.ADD_SITE_ENVIRONMENT
		) {
			return {
				...breadcrumbsData,
				defaultStepper: () => cloudBackupStepper(),
			};
		}

		return breadcrumbsData;
	});
}
