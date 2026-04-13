/**
 * Avoid leaking full URLs (local backend URLs, PR links with tokens) into log lines.
 */
export function redactHttpUrls(message: string): string {
  return message.replace(/https?:\/\/[^\s"'<>]+/g, '[url]');
}
