/** Nest DI tokens for active source / destination settings groups. */
export const SOURCE_SETTINGS_GROUP = Symbol('SOURCE_SETTINGS_GROUP');
export const DESTINATION_SETTINGS_GROUP = Symbol('DESTINATION_SETTINGS_GROUP');

export type SettingsGroupId = 'core' | 'source' | 'destination';
