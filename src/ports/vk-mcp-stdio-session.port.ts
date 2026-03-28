import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

/**
 * Long-lived Vibe Kanban MCP client over stdio (adapter boundary).
 * Lets listeners and MCP call sites depend on capability, not the concrete service class.
 */
export interface VkMcpStdioSessionPort {
  shutdown(): Promise<void>;
  runWithClient<T>(fn: (client: Client) => Promise<T>): Promise<T>;
}
