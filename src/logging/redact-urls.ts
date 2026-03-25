/**
 * §14 — Avoid leaking full URLs (MCP endpoints, PR links with tokens) into log lines.
 */
export function redactHttpUrls(message: string): string {
  return message.replace(/https?:\/\/[^\s"'<>]+/g, '[url]');
}
