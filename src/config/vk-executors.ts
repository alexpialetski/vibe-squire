/** Values for `start_workspace` executor (Vibe Kanban MCP; case-insensitive on server). */
export const VK_WORKSPACE_EXECUTOR_OPTIONS: ReadonlyArray<{
  value: string;
  label: string;
}> = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'amp', label: 'Amp' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'codex', label: 'Codex' },
  { value: 'opencode', label: 'OpenCode' },
  { value: 'cursor_agent', label: 'Cursor Agent' },
  { value: 'qwen-code', label: 'Qwen Code' },
  { value: 'copilot', label: 'Copilot' },
  { value: 'droid', label: 'Droid' },
];

export function normalizeVkWorkspaceExecutor(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  const found = VK_WORKSPACE_EXECUTOR_OPTIONS.find(
    (o) => o.value.toLowerCase() === t,
  );
  return found ? found.value : null;
}
