import { gql } from '@apollo/client';

export const GET_SITE = gql`
	query getSite($siteID: ID!) {
		site(id: $siteID) {
			id
			status
		}
	}
`;
