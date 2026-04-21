import type { SupportedDestinationType } from '../config/integration-types';

/** Shared with {@link VibeKanbanDestinationConfiguredGuard} and API consumers. */
export const VK_DESTINATION_NOT_ACTIVE_MESSAGE =
  'Vibe Kanban routes require VIBE_SQUIRE_DESTINATION_TYPE=vibe_kanban';

export function isVibeKanbanDestination(
  destinationType: SupportedDestinationType,
): boolean {
  return destinationType === 'vibe_kanban';
}

/**
 * True when this process uses Vibe Kanban as the sync destination (local HTTP API).
 */
export function isVibeKanbanBoardDestination(
  destinationType: SupportedDestinationType,
): boolean {
  return isVibeKanbanDestination(destinationType);
}
