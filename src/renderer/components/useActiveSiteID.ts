import { useEffect } from 'react';
import { store, actions } from '../store/store';

const useActiveSiteID = (siteID: string): void => useEffect(() => {
	store.dispatch(actions.setActiveSiteID(siteID));

	return () => {
		store.dispatch(actions.setActiveSiteID(null));
	};
}, [siteID]);

export default useActiveSiteID;
