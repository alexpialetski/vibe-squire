import { Query, Resolver } from '@nestjs/graphql';
import { HealthStatus } from './health-status.object';
import { readAppPackageVersion } from './read-app-package-version';

@Resolver()
export class HealthResolver {
  @Query(() => HealthStatus)
  health(): HealthStatus {
    return {
      ok: true,
      version: readAppPackageVersion(),
      timestamp: new Date(),
    };
  }
}
