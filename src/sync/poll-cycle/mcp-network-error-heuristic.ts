/** Rough classifier for sync failures that should mark VK destination health degraded/error. */
export function looksLikeMcpOrNetworkError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('mcp') ||
    m.includes('fetch') ||
    m.includes('econnrefused') ||
    m.includes('socket') ||
    m.includes('network') ||
    m.includes('streamablehttp')
  );
}
