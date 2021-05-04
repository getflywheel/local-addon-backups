import { useSelector, TypedUseSelectorHook } from 'react-redux';
import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import { providersSlice } from './providersSlice';
import { activeSiteSlice } from './activeSiteSlice';
import { directorSlice } from './directorSlice';
import * as thunks from './thunks';
import { showSiteBanner } from '../helpers/showSiteBanner';
import { clearSiteBanner } from '../helpers/clearSiteBanner';
import { IpcAsyncResponse } from '../../helpers/createIpcAsyncResponse';

/**
 * Convenience collection of Redux actions.
 */
export const actions = {
	...activeSiteSlice.actions,
	...providersSlice.actions,
	...directorSlice.actions,
	// include all thunks here to make it easier to reference both actions and thunks from same place
	...thunks,
};

const GRAPHQL_BANNER_ID = 'GraphQL Internal Error';

/**
 * Middleware to intercept thunks and clear/show any necessary internal GraphQL errors like authentication.
 */
const onThunkRejectedMiddleWare = (_) => (next) => (
	action: {
		error: { message: string, name: string },
		meta: any,
		payload?: any,
		type: string,
	},
) => {
	const siteId: string | undefined = action.meta?.arg?.siteId;

	if (action?.type?.endsWith('/pending')) {
		// clear out any possible previous graphql banners
		clearSiteBanner(siteId, GRAPHQL_BANNER_ID);
	} else if (action?.type?.endsWith('/rejected')) {
		const payload: IpcAsyncResponse['error'] | undefined = action.payload;

		// if rejected error payload is explicitly set to an IpcAsyncResponse that failed Hub GraphQL authentication
		if (payload?.isHubGraphQLAuthError) {
			showSiteBanner({
				icon: 'warning',
				id: GRAPHQL_BANNER_ID,
				/*
				// todo - crum: this would be nice but requires exposing the hub ipc event to login
				linkText: 'Log in to Hub',
				linkHref: 'https://localwp.com/help-docs/advanced/updating-rsync-on-linux/',
				*/
				message: 'There was an issue authenticating your Hub Account. Please log in and try again.',
				siteID: siteId,
				title: 'Hub Error',
				variant: 'error',
			});
		} else if (payload?.isHubGraphQLNetworkError) {
			showSiteBanner({
				icon: 'warning',
				id: GRAPHQL_BANNER_ID,
				message: 'There was an issue with the network and Cloud Backups requires internet access. Please check your connection and try again.',
				siteID: siteId,
				title: 'Connection Error',
				variant: 'error',
			});
		}
	}

	return next(action);
};

const middleware = [onThunkRejectedMiddleWare, ...getDefaultMiddleware()] as ReturnType<typeof getDefaultMiddleware>;

/**
 * The Redux store.
 */
export const store = configureStore({
	reducer: {
		activeSite: activeSiteSlice.reducer,
		providers: providersSlice.reducer,
		director: directorSlice.reducer,
	},
	middleware,
});

/**
 * Redux store typings.
 */
export type AppState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;

export const useStoreSelector = useSelector as TypedUseSelectorHook<AppState>;

export type AppThunkApiConfig<R = any> = {
	dispatch: AppDispatch;
	rejectValue: R;
	state: AppState;
};

