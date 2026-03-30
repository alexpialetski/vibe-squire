import type { LevelWithSilent } from 'pino';
import type {
  SupportedSourceType,
  SupportedDestinationType,
} from './integration-types';

export type AppEnv = {
  nodeEnv: string | undefined;
  databaseUrl: string;
  host: string;
  port: number;
  openapiEnabled: boolean;
  logLevel: LevelWithSilent;
  /** When set, JSON logs are also written to this path (in addition to console). */
  logFilePath: string | undefined;
  /** PR / SCM adapter key (from `VIBE_SQUIRE_SOURCE_TYPE` + default). Invalid env fails at boot. */
  sourceType: SupportedSourceType;
  /** Work-board adapter key (from `VIBE_SQUIRE_DESTINATION_TYPE` + default). Invalid env fails at boot. */
  destinationType: SupportedDestinationType;
};

/** Nest injection token for parsed application environment ({@link AppEnv}). */
export const APP_ENV = Symbol('APP_ENV');
