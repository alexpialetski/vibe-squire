import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { APP_ENV, type AppEnv } from '../config/env-schema';
import { SettingsService } from '../settings/settings.service';
import {
  isVibeKanbanDestination,
  parseVkStdioCommand,
} from './mcp-transport-config';
import type { VkMcpStdioSessionPort } from '../ports/vk-mcp-stdio-session.port';

/**
 * One long-lived MCP client over stdio (spawned `npx vibe-kanban --mcp` or custom command).
 * Lazy start on first use; serializes calls; tears down on transport/config change or shutdown.
 */
@Injectable()
export class VkMcpStdioSessionService
  implements OnModuleDestroy, VkMcpStdioSessionPort
{
  private readonly logger = new Logger(VkMcpStdioSessionService.name);
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private activeConfigKey: string | null = null;
  private stderrTail?: (chunk: Buffer | string) => void;

  /** Serialize all MCP operations on the shared client. */
  private chain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly settings: SettingsService,
    @Inject(APP_ENV) private readonly appEnv: AppEnv,
  ) {}

  private buildConfigKey(): string {
    return JSON.stringify({
      dest: this.appEnv.destinationType,
      stdio: this.settings.getEffective('vk_mcp_stdio_json'),
    });
  }

  /**
   * Stop the child process if running (e.g. when destination or stdio config changes).
   */
  async shutdown(): Promise<void> {
    await this.teardown();
  }

  async onModuleDestroy(): Promise<void> {
    await this.teardown();
  }

  private async teardown(): Promise<void> {
    if (this.stderrTail && this.transport?.stderr) {
      const s = this.transport.stderr as unknown as {
        removeListener: (
          ev: string,
          fn: (chunk: Buffer | string) => void,
        ) => void;
      };
      try {
        s.removeListener('data', this.stderrTail);
      } catch {
        /* stream may already be closed */
      }
      this.stderrTail = undefined;
    }
    if (this.client) {
      try {
        await this.client.close();
      } catch (e) {
        this.logger.debug(
          `MCP client close: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    this.client = null;
    this.transport = null;
    this.activeConfigKey = null;
  }

  private async ensureConnected(): Promise<void> {
    if (!isVibeKanbanDestination(this.appEnv.destinationType)) {
      throw new Error(
        'Vibe Kanban MCP (stdio): DESTINATION_TYPE is not vibe_kanban',
      );
    }
    const key = this.buildConfigKey();
    if (this.client && this.transport && key === this.activeConfigKey) {
      return;
    }

    await this.teardown();

    const parsed = parseVkStdioCommand(
      this.settings.getEffective('vk_mcp_stdio_json'),
    );
    if (!parsed) {
      throw new Error(
        'Invalid vk_mcp_stdio_json: expected JSON array [command, ...args]',
      );
    }

    const transport = new StdioClientTransport({
      command: parsed.command,
      args: parsed.args,
      stderr: 'pipe',
    });

    const stderr = transport.stderr;
    if (stderr) {
      this.stderrTail = (chunk: Buffer | string) => {
        const line = (
          typeof chunk === 'string' ? chunk : chunk.toString('utf8')
        ).trimEnd();
        if (!line) {
          return;
        }
        // Child MCP server tracing usually goes to stderr; keep routine noise at debug.
        // Escalate lines that look like real failures (do not parse Rust struct dumps).
        if (stderrLineLooksLikeHardFailure(line)) {
          this.logger.warn(`[vk-mcp stderr] ${line}`);
        } else {
          this.logger.debug(`[vk-mcp stderr] ${line}`);
        }
      };
      stderr.on('data', this.stderrTail);
    }

    const client = new Client({ name: 'vibe-squire', version: '0.0.1' });
    await client.connect(transport);

    this.transport = transport;
    this.client = client;
    this.activeConfigKey = key;
    this.logger.log(
      `Vibe Kanban MCP stdio started: ${parsed.command} ${parsed.args.join(' ')}`,
    );
  }

  /**
   * Run `fn` with the persistent stdio MCP client (lazy connect, serialized).
   */
  async runWithClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const op = this.chain.then(async () => {
      await this.ensureConnected();
      return fn(this.client!);
    });
    this.chain = op.then(
      () => undefined,
      () => undefined,
    );
    return op;
  }
}

function stderrLineLooksLikeHardFailure(line: string): boolean {
  const t = line.trimStart();
  return (
    /\b(ERROR|FATAL)\b/.test(line) ||
    /\bpanic(?:ked)?\b/i.test(line) ||
    /thread '[^']+' panicked/i.test(line) ||
    /^error[\s:]/i.test(t)
  );
}
