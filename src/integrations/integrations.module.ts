import { DynamicModule, Module } from '@nestjs/common';
import type { AppEnv } from '../config/app-env.token';
import { GithubSourceModule } from './github/github-source.module';
import { VibeKanbanDestinationModule } from './vibe-kanban/vibe-kanban-destination.module';

/**
 * Boot-time integration graph: one module per {@link AppEnv.sourceType} /
 * {@link AppEnv.destinationType}. Registered as **global** so sync, status, setup, and UI
 * can inject port tokens without importing this module explicitly.
 */
@Module({})
export class IntegrationsModule {
  static register(env: AppEnv): DynamicModule {
    const imports: Array<
      typeof GithubSourceModule | typeof VibeKanbanDestinationModule
    > = [];
    if (env.sourceType === 'github') {
      imports.push(GithubSourceModule);
    }
    if (env.destinationType === 'vibe_kanban') {
      imports.push(VibeKanbanDestinationModule);
    }
    if (imports.length === 0) {
      throw new Error(
        `No integration modules registered for source=${String(env.sourceType)} destination=${String(env.destinationType)}`,
      );
    }
    return {
      module: IntegrationsModule,
      global: true,
      imports,
      exports: imports,
    };
  }
}
