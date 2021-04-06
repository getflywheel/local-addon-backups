import { useEffect } from 'react';
import { store, actions } from '../store/store';

const useUpdateActiveSiteAndDataSources = (siteID: string): void => useEffect(() => {
	store.dispatch(actions.updateActiveSiteAndDataSources(siteID));

	return () => {
		store.dispatch(actions.updateActiveSiteAndDataSources(null));
	};
}, [siteID]);

export default useUpdateActiveSiteAndDataSources;
