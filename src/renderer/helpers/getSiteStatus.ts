import type { Site } from '@getflywheel/local';
import { useQuery, useSubscription } from '@apollo/client';
import { GET_SITE } from '../localClient/queries';
import { SITE_STATUS_CHANGED } from '../localClient/subscriptions';

export const getSiteStatus = (site: Site) => {
	const { data: siteQueryData } = useQuery(GET_SITE, {
		variables: { siteID: site.id },
	});

	const { data: siteStatusSubscriptionData } = useSubscription(SITE_STATUS_CHANGED);

	const subscriptionResult = siteStatusSubscriptionData?.siteStatusChanged;

	const siteStatus = subscriptionResult?.id === site.id
		? subscriptionResult?.status
		: siteQueryData?.site.status;

	return siteStatus;
};
