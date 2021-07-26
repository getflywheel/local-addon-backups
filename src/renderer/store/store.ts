import { useSelector, TypedUseSelectorHook } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import * as thunks from './thunks';
import * as multiMachineThunks from './multiMachineThunks';
import { activeSiteSlice } from './activeSiteSlice';
import { directorSlice } from './directorSlice';
import { providersSlice } from './providersSlice';
import { snapshotsSlice } from './snapshotsSlice';
import { multiMachineRestoreSlice } from './multiMachineRestoreSlice';

/**
 * Convenience collection of Redux actions.
 */
export const actions = {
	...activeSiteSlice.actions,
	...directorSlice.actions,
	...providersSlice.actions,
	...snapshotsSlice.actions,
	...multiMachineRestoreSlice.actions,
	// include all thunks here to make it easier to reference both actions and thunks from same place
	...thunks,
	...multiMachineThunks,
};

/**
 * The Redux store.
 */
export const store = configureStore({
	reducer: {
		activeSite: activeSiteSlice.reducer,
		director: directorSlice.reducer,
		providers: providersSlice.reducer,
		snapshots: snapshotsSlice.reducer,
		multiMachineRestore: multiMachineRestoreSlice.reducer,
	},
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

