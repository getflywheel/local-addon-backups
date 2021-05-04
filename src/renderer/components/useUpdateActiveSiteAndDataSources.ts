import { useEffect } from 'react';
import { store, actions } from '../store/store';

const useUpdateActiveSiteAndDataSources = (siteId: string): void => useEffect(() => {
	store.dispatch(actions.updateActiveSiteAndDataSources({ siteId }));

	return () => {
		store.dispatch(actions.updateActiveSiteAndDataSources(null));
	};
}, [siteId]);

export default useUpdateActiveSiteAndDataSources;
