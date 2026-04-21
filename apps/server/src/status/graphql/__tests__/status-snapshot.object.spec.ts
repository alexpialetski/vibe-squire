import { LazyMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/lazy-metadata.storage';
import { TypeMetadataStorage } from '@nestjs/graphql/dist/schema-builder/storages/type-metadata.storage';
import { z } from 'zod';
import { statusSnapshotSchema } from '../../status-snapshot.contract';
import {
  StatusConfiguration,
  StatusDatabase,
  StatusDestination,
  StatusGh,
  StatusManualSync,
  StatusScheduledSync,
  StatusScout,
  StatusScoutLastPoll,
  StatusSetup,
  StatusSnapshot,
} from '../status-snapshot.object';

/** @internal — Nest metadata store; used only to compare declared @Field names to Zod shapes. */
interface GqlFieldMeta {
  name: string;
}
interface GqlTypeMeta {
  fields: { getAll: () => GqlFieldMeta[] };
}
interface GqlMetadataStore {
  metadataByTargetCollection: Map<unknown, GqlTypeMeta>;
}
const gqlStore = TypeMetadataStorage as unknown as GqlMetadataStore;

function objectSchemaKeys(schema: unknown): string[] {
  const sh = (schema as { shape?: Record<string, unknown> }).shape;
  if (!sh) {
    throw new Error('expected z.object schema with readable .shape');
  }
  return Object.keys(sh);
}

function graphqlObjectFieldNames(Cls: abstract new () => unknown): string[] {
  LazyMetadataStorage.load([Cls]);
  const typeMeta = gqlStore.metadataByTargetCollection.get(Cls);
  if (!typeMeta) {
    throw new Error(`No GraphQL metadata for ${Cls.name}`);
  }
  return typeMeta.fields
    .getAll()
    .map((m) => m.name)
    .sort();
}

/** Every key in the Zod object schema has a matching `@Field` name (GraphQL may add extras for REST parity). */
function expectZodKeysCoveredByGraphql(
  zodObject: unknown,
  Cls: abstract new () => unknown,
): void {
  const zodKeys = objectSchemaKeys(zodObject);
  const gqlKeys = new Set(graphqlObjectFieldNames(Cls));
  for (const k of zodKeys) {
    expect(gqlKeys.has(k)).toBe(true);
  }
}

describe('StatusSnapshot GraphQL object fields vs Zod', () => {
  const shape = statusSnapshotSchema.shape;

  it('StatusSnapshot top-level', () => {
    expectZodKeysCoveredByGraphql(statusSnapshotSchema, StatusSnapshot);
  });

  it('nested: gh', () => {
    expectZodKeysCoveredByGraphql(shape.gh, StatusGh);
  });

  it('nested: database', () => {
    expectZodKeysCoveredByGraphql(shape.database, StatusDatabase);
  });

  it('nested: setup', () => {
    expectZodKeysCoveredByGraphql(shape.setup, StatusSetup);
  });

  it('nested: configuration', () => {
    expectZodKeysCoveredByGraphql(shape.configuration, StatusConfiguration);
  });

  it('destinations[] element', () => {
    const el = (shape.destinations as z.ZodArray).element;
    expectZodKeysCoveredByGraphql(el, StatusDestination);
  });

  it('scouts[] element', () => {
    const el = (shape.scouts as z.ZodArray).element;
    expectZodKeysCoveredByGraphql(el, StatusScout);
  });

  it('last_poll sub-object on scout', () => {
    const scoutEl = (shape.scouts as z.ZodArray).element as unknown as {
      shape: Record<string, unknown>;
    };
    const lastPoll = scoutEl.shape.last_poll;
    expectZodKeysCoveredByGraphql(lastPoll, StatusScoutLastPoll);
  });

  it('manual_sync', () => {
    expectZodKeysCoveredByGraphql(shape.manual_sync, StatusManualSync);
  });

  it('scheduled_sync', () => {
    expectZodKeysCoveredByGraphql(shape.scheduled_sync, StatusScheduledSync);
  });
});
