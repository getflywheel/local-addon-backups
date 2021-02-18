import { createSelector } from '@reduxjs/toolkit';
import { store } from './store';

const activeSiteID = (state) => state.activeSiteID;

export const selectors = {
	activeSiteID: (): string => activeSiteID(store.getState()),
};
