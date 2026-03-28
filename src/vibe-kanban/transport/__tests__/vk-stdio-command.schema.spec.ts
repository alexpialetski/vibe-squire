import { parseVkStdioCommand } from '../vk-stdio-command.schema';

describe('parseVkStdioCommand', () => {
  it('returns null for empty / whitespace', () => {
    expect(parseVkStdioCommand('')).toBeNull();
    expect(parseVkStdioCommand('  \t')).toBeNull();
  });

  it('parses JSON array to command and args', () => {
    expect(
      parseVkStdioCommand('["npx","-y","vibe-kanban@latest","--mcp"]'),
    ).toEqual({
      command: 'npx',
      args: ['-y', 'vibe-kanban@latest', '--mcp'],
    });
  });

  it('returns null for non-array JSON', () => {
    expect(parseVkStdioCommand('{}')).toBeNull();
    expect(parseVkStdioCommand('[]')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseVkStdioCommand('not json')).toBeNull();
  });
});
