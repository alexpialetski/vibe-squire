import type { LevelWithSilent } from 'pino';
import type {
  SupportedSourceType,
  SupportedDestinationType,
} from './integration-types';
import type { SettingEnvVarName } from '../settings/setting-keys';

export type AppEnv = {
  nodeEnv: string | undefined;
  databaseUrl: string;
  host: string;
  port: number;
  openapiEnabled: boolean;
  logLevel: LevelWithSilent;
  logToFile: boolean;
  logFilePath: string | undefined;
  /** PR / SCM adapter key (from `SOURCE_TYPE` + default). Invalid env fails at boot. */
  sourceType: SupportedSourceType;
  /** Work-board adapter key (from `DESTINATION_TYPE` + default). Invalid env fails at boot. */
  destinationType: SupportedDestinationType;
  /** Non-empty trimmed values for setting keys that map to `envVar` in {@link SETTING_DEFINITIONS}. */
  settingsEnv: Partial<Record<SettingEnvVarName, string>>;
};

/** Nest injection token for parsed application environment ({@link AppEnv}). */
export const APP_ENV = Symbol('APP_ENV');
