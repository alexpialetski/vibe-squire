/** PR / SCM side (where review requests are listed). */
export const SUPPORTED_SOURCE_TYPES = ['github'] as const;
export type SupportedSourceType = (typeof SUPPORTED_SOURCE_TYPES)[number];

/** Work board / issue tracker side. */
export const SUPPORTED_DESTINATION_TYPES = ['vibe_kanban'] as const;
export type SupportedDestinationType =
  (typeof SUPPORTED_DESTINATION_TYPES)[number];
