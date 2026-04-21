import { z } from 'zod';
import {
  dbStateValues,
  destStateValues,
  ghStateValues,
  scoutUiStateValues,
  statusSnapshotSchema,
} from '../../status-snapshot.contract';
import {
  DatabaseState,
  DestinationState,
  GhState,
  ScoutUiState,
} from '../status-enums';

function sortStrings(a: readonly string[]): string[] {
  return [...a].map(String).sort();
}

function enumObjectValues(e: Record<string, string>): string[] {
  return sortStrings(Object.values(e));
}

/** Runtime extractor for `z.enum(...).options`; typed loosely to stay resilient across Zod versions. */
function zodEnumMemberList(schema: unknown): string[] {
  const options = (schema as { options?: unknown }).options;
  if (!Array.isArray(options)) {
    throw new Error('expected z.enum schema with readable .options');
  }
  return sortStrings(options.map((v) => String(v)));
}

function innerObjectSchema(schema: unknown, key: string): unknown {
  const shape = (schema as { shape?: Record<string, unknown> }).shape;
  if (!shape || !(key in shape)) {
    throw new Error(`expected object schema with shape.${key}`);
  }
  return shape[key];
}

describe('status GraphQL enums vs Zod', () => {
  it('GhState matches z.enum for gh.state', () => {
    const gh = innerObjectSchema(statusSnapshotSchema, 'gh');
    const state = innerObjectSchema(gh, 'state');
    expect(enumObjectValues(GhState)).toEqual(zodEnumMemberList(state));
    expect(sortStrings(ghStateValues)).toEqual(zodEnumMemberList(state));
  });

  it('DatabaseState matches z.enum for database.state', () => {
    const database = innerObjectSchema(statusSnapshotSchema, 'database');
    const state = innerObjectSchema(database, 'state');
    expect(enumObjectValues(DatabaseState)).toEqual(zodEnumMemberList(state));
    expect(sortStrings(dbStateValues)).toEqual(zodEnumMemberList(state));
  });

  it('DestinationState matches z.enum for destinations[].state', () => {
    const destinations = statusSnapshotSchema.shape.destinations as z.ZodArray;
    const inner = destinations.element;
    const state = innerObjectSchema(inner, 'state');
    expect(enumObjectValues(DestinationState)).toEqual(
      zodEnumMemberList(state),
    );
    expect(sortStrings(destStateValues)).toEqual(zodEnumMemberList(state));
  });

  it('ScoutUiState matches z.enum for scouts[].state', () => {
    const scouts = statusSnapshotSchema.shape.scouts as z.ZodArray;
    const inner = scouts.element;
    const state = innerObjectSchema(inner, 'state');
    expect(enumObjectValues(ScoutUiState)).toEqual(zodEnumMemberList(state));
    expect(sortStrings(scoutUiStateValues)).toEqual(zodEnumMemberList(state));
  });
});
