import { useSelector, TypedUseSelectorHook } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { IpcAsyncResponse } from '../../helpers/createIpcAsyncResponse';
import { middleware } from './middleware';
import { providersSlice } from './providersSlice';
import { activeSiteSlice } from './activeSiteSlice';
import { directorSlice } from './directorSlice';
import * as thunks from './thunks';

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

export type AppThunkApiConfig<RE = any> = {
	dispatch: AppDispatch;
	rejectValue: RE;
	state: AppState;
};

