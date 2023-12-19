import fetch from 'cross-fetch';
import { split } from '@apollo/client';
import { ApolloClient, createHttpLink } from '@apollo/client/core';
import { InMemoryCache } from '@apollo/client/cache';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import readGraphQLConfig from './readGraphQLConfig';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';

const {
	url,
	authToken,
	subscriptionUrl,
} = readGraphQLConfig();

const httpLink = createHttpLink({
	fetch,
	uri: url,
});

const authLink = setContext((_, { headers }) => ({
	headers: {
		...headers,
		authorization: authToken ? `Bearer ${authToken}` : '',
	},
}));

const wsLink = new GraphQLWsLink(
	createClient({
		url: subscriptionUrl,
		connectionParams: {
			authToken: `Bearer ${authToken}`,
		},
	}),
);

const splitLink = split(
	({ query }) => {
	   const definition = getMainDefinition(query);
	   return (
		   definition.kind === 'OperationDefinition' &&
		   definition.operation === 'subscription'
	   );
	},
	wsLink,
	authLink.concat(httpLink),
);

export const client = new ApolloClient({
	link: splitLink,
	cache: new InMemoryCache(),
	defaultOptions: {
		watchQuery: {
			fetchPolicy: 'cache-and-network',
		},
	},
});
