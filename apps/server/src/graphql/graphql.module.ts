import { join } from 'node:path';
import { HttpException, Module } from '@nestjs/common';
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius';
import { GraphQLModule } from '@nestjs/graphql';
import { NoSchemaIntrospectionCustomRule } from 'graphql';
import { APP_ENV, type AppEnv } from '../config/app-env.token';
import { HealthResolver } from './health.resolver';

const SCHEMA_FILE = join(process.cwd(), 'src/generated/schema.graphql');

function isProduction(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'production';
}

@Module({
  imports: [
    GraphQLModule.forRootAsync<MercuriusDriverConfig>({
      driver: MercuriusDriver,
      inject: [APP_ENV],
      useFactory: (appEnv: AppEnv) => {
        const prod = isProduction(appEnv.nodeEnv);
        return {
          path: '/graphql',
          autoSchemaFile: SCHEMA_FILE,
          sortSchema: true,
          graphiql: !prod,
          subscription: true,
          validationRules: prod ? [NoSchemaIntrospectionCustomRule] : [],
          errorFormatter(execution) {
            const errors = execution.errors.map((error) => {
              const formatted = error.toJSON();
              const orig = error.originalError;
              if (orig instanceof HttpException) {
                return {
                  ...formatted,
                  extensions: {
                    ...formatted.extensions,
                    statusCode: orig.getStatus(),
                  },
                };
              }
              return formatted;
            });
            return {
              statusCode: 200,
              response: {
                data: execution.data ?? null,
                errors,
              },
            };
          },
        };
      },
    }),
  ],
  providers: [HealthResolver],
})
export class GraphqlModule {}
