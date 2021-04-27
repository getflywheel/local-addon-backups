import ws from 'subscriptions-transport-ws';
import fetch from 'cross-fetch';
import { split } from '@apollo/client';
import { ApolloClient, createHttpLink } from '@apollo/client/core';
import { WebSocketLink } from '@apollo/client/link/ws';
import { InMemoryCache } from '@apollo/client/cache';
import { setContext } from '@apollo/client/link/context';
import { getMainDefinition } from '@apollo/client/utilities';
import readGraphQLConfig from './readGraphQLConfig';

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

const wsLink = new WebSocketLink({
	uri: subscriptionUrl,
	options: {
		reconnect: true,
		connectionParams: {
			authToken: `Bearer ${authToken}`,
		},
	},
	webSocketImpl: ws,
});

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
