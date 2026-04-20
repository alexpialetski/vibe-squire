import { registerEnumType } from '@nestjs/graphql';
import {
  dbStateValues,
  destStateValues,
  ghStateValues,
  scoutUiStateValues,
} from '@vibe-squire/shared';

function enumFromValues<T extends string>(
  name: string,
  values: readonly T[],
): Record<T, T> {
  const o = {} as Record<T, T>;
  for (const v of values) {
    o[v] = v;
  }
  registerEnumType(o, { name });
  return o;
}

/** GraphQL `GhState` — members follow {@link ghStateValues}. */
export const GhState = enumFromValues('GhState', ghStateValues);

/** GraphQL `DatabaseState` — members follow {@link dbStateValues}. */
export const DatabaseState = enumFromValues('DatabaseState', dbStateValues);

/** GraphQL `DestinationState` — members follow {@link destStateValues}. */
export const DestinationState = enumFromValues(
  'DestinationState',
  destStateValues,
);

/** GraphQL `ScoutUiState` — members follow {@link scoutUiStateValues}. */
export const ScoutUiState = enumFromValues('ScoutUiState', scoutUiStateValues);

export type GhStateValue = (typeof ghStateValues)[number];
export type DatabaseStateValue = (typeof dbStateValues)[number];
export type DestinationStateValue = (typeof destStateValues)[number];
export type ScoutUiStateValue = (typeof scoutUiStateValues)[number];
