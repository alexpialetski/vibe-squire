import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { Kind, OperationTypeNode } from 'graphql';
import { createClient } from 'graphql-ws';

export function resolveGraphqlWsUrl(): string {
  // Keep tests and SSR safe where `window` is unavailable.
  if (typeof window === 'undefined') {
    return 'ws://127.0.0.1:4000/graphql';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/graphql`;
}

const httpLink = new HttpLink({ uri: '/graphql' });
const wsLink = new GraphQLWsLink(
  createClient({
    url: resolveGraphqlWsUrl(),
  }),
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === OperationTypeNode.SUBSCRIPTION
    );
  },
  wsLink,
  httpLink,
);

export const apolloClient = new ApolloClient({
  name: '@vibe-squire/web',
  version: 'p2-3',
  link: splitLink,
  cache: new InMemoryCache(),
});
