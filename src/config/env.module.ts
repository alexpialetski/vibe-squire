import { Global, Module, type DynamicModule } from '@nestjs/common';
import { APP_ENV, type AppEnv } from './env-schema';

@Global()
@Module({})
export class EnvModule {
  static forRoot(env: AppEnv): DynamicModule {
    return {
      module: EnvModule,
      providers: [{ provide: APP_ENV, useValue: env }],
      exports: [APP_ENV],
    };
  }
}
