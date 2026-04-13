/** Rough classifier for sync failures that should mark VK destination health degraded/error. */
export function looksLikeVkBoardOrNetworkError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('vibe kanban') ||
    m.includes('vk api') ||
    m.includes('list_organizations') ||
    m.includes('list_projects') ||
    m.includes('list_repos') ||
    m.includes('fetch') ||
    m.includes('econnrefused') ||
    m.includes('socket') ||
    m.includes('network')
  );
}
