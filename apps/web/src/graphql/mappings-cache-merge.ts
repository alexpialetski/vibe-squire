import type {
  MappingsQueryQuery,
  UpdateMappingMutationMutation,
  UpsertMappingMutationMutation,
} from '../__generated__/graphql';

const OPTIMISTIC_PREFIX = 'optimistic:';

export function randomOptimisticMappingId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${OPTIMISTIC_PREFIX}${crypto.randomUUID()}`;
  }
  return `${OPTIMISTIC_PREFIX}${Date.now()}`;
}

export function mergeMappingListAfterWrite(
  existing: MappingsQueryQuery['mappings'],
  m:
    | UpsertMappingMutationMutation['upsertMapping']
    | UpdateMappingMutationMutation['updateMapping'],
): MappingsQueryQuery['mappings'] {
  const prev =
    existing.find((row) => row.id === m.id) ??
    existing.find((row) => row.githubRepo === m.githubRepo);
  const filtered = existing.filter((row) => {
    if (row.id === m.id) {
      return false;
    }
    if (
      row.id.startsWith(OPTIMISTIC_PREFIX) &&
      row.githubRepo === m.githubRepo &&
      row.id !== m.id
    ) {
      return false;
    }
    return true;
  });
  const createdAt =
    prev?.createdAt != null && typeof prev.createdAt === 'string'
      ? prev.createdAt
      : new Date().toISOString();
  return [
    ...filtered,
    {
      __typename: 'MappingGql' as const,
      id: m.id,
      githubRepo: m.githubRepo,
      vibeKanbanRepoId: m.vibeKanbanRepoId,
      label: m.label ?? null,
      createdAt,
      updatedAt: new Date().toISOString(),
    },
  ];
}
