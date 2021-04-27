import { gql } from '@apollo/client';

export const SITE_STATUS_CHANGED = gql`
	subscription siteStatusChanged {
		siteStatusChanged {
			id
			status
		}
	}
`;
