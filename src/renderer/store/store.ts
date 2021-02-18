import { useSelector, TypedUseSelectorHook } from 'react-redux';
import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

export { selectors } from './selectors';

const activeSiteIDSlice = createSlice({
	name: 'activeSiteID',
	initialState: null,
	reducers: {
		setActiveSiteID: (state, action: PayloadAction<string>) => {
			state = action.payload;
			return state;
		},
	},
});

export const store = configureStore({
	reducer: {
		activeSiteID: activeSiteIDSlice.reducer,
	},
});

export const actions = {
	...activeSiteIDSlice.actions,
};

export type State = ReturnType<typeof store.getState>;
export const useStoreSelector = useSelector as TypedUseSelectorHook<State>;
