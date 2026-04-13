import {
  CanActivate,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  DESTINATION_STATUS_PORT,
  SOURCE_STATUS_PORT,
} from '../ports/injection-tokens';
import type { DestinationStatusProvider } from '../ports/destination-status.port';
import type { SourceStatusProvider } from '../ports/source-status.port';

/**
 * Blocks manual sync when the source or destination {@link checkReadiness} reports `error`.
 * Does not block on `unknown` / `degraded` destination (e.g. before first poll).
 */
@Injectable()
export class SyncDependenciesGuard implements CanActivate {
  constructor(
    @Inject(SOURCE_STATUS_PORT)
    private readonly sourceStatus: SourceStatusProvider,
    @Inject(DESTINATION_STATUS_PORT)
    private readonly destinationStatus: DestinationStatusProvider,
  ) {}

  async canActivate(): Promise<boolean> {
    const src = this.sourceStatus.checkReadiness();
    if (src.state !== 'ok') {
      throw new HttpException(
        {
          error: 'dependency_unavailable',
          subsystem: this.sourceStatus.sourceType,
          state: src.state,
          ...(src.message ? { message: src.message } : {}),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const dest = await this.destinationStatus.checkReadiness();
    if (dest.state === 'error') {
      throw new HttpException(
        {
          error: 'dependency_unavailable',
          subsystem: this.destinationStatus.destinationType,
          state: dest.state,
          ...(dest.message ? { message: dest.message } : {}),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return true;
  }
}
