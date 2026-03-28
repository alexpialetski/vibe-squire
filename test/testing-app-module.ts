import type { DynamicModule } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { parseAppEnv } from '../src/config/env-schema';

/**
 * Use this in integration tests instead of importing raw {@link AppModule} (which has no
 * `imports` until `forRoot` runs) or calling `AppModule.forRoot` without a parsed `AppEnv`.
 *
 * Parses the given env snapshot once. Pass a merged object (e.g. `{ ...process.env, KEY: 'x' }`)
 * to avoid mutating global `process.env` or to freeze config when env changes between test boots.
 */
export function testingAppModule(
  env: NodeJS.ProcessEnv = process.env,
): DynamicModule {
  return AppModule.forRoot(parseAppEnv(env));
}
