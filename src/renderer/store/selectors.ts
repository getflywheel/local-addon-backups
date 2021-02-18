import { createSelector } from '@reduxjs/toolkit';
import { store } from './store';
import type { HubProviderRecord } from '../../types';

const activeSiteID = (state) => state.activeSiteID;

const enabledProviders = (state) => state.enabledProviders;

export const selectors = {
	activeSiteID: (): string => activeSiteID(store.getState()),
	enabledProviders: (): HubProviderRecord[] => enabledProviders(store.getState()),
};
