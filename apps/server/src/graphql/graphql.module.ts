import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { HealthResolver } from './health.resolver';

const SCHEMA_FILE = join(process.cwd(), 'src/generated/schema.graphql');

function isProduction(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'production';
}

@Module({
  imports: [
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [APP_ENV],
      useFactory: (appEnv: AppEnv) => {
        const prod = isProduction(appEnv.nodeEnv);
        return {
          path: '/graphql',
          autoSchemaFile: SCHEMA_FILE,
          sortSchema: true,
          subscriptions: {
            'graphql-ws': true,
          },
          introspection: !prod,
          playground: false,
          plugins: prod
            ? [ApolloServerPluginLandingPageDisabled()]
            : [ApolloServerPluginLandingPageLocalDefault()],
        };
      },
    }),
  ],
  providers: [HealthResolver],
})
export class GraphqlModule {}
