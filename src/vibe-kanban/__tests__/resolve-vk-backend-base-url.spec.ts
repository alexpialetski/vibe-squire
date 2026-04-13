import { resolveVkBackendBaseUrl } from '../resolve-vk-backend-base-url';

describe('resolveVkBackendBaseUrl', () => {
  it('prefers VIBE_SQUIRE_VK_BACKEND_URL over everything else', async () => {
    const url = await resolveVkBackendBaseUrl({
      VIBE_SQUIRE_VK_BACKEND_URL: 'https://vk.example/api/',
      VIBE_BACKEND_URL: 'http://ignored',
      VIBE_SQUIRE_VK_PORT: '9999',
    });
    expect(url).toBe('https://vk.example/api');
  });

  it('falls back to VIBE_BACKEND_URL', async () => {
    const url = await resolveVkBackendBaseUrl({
      VIBE_BACKEND_URL: 'http://127.0.0.42:777/',
    });
    expect(url).toBe('http://127.0.0.42:777');
  });

  it('builds http URL from explicit host and port env', async () => {
    const url = await resolveVkBackendBaseUrl({
      VIBE_SQUIRE_VK_HOST: '10.0.0.1',
      VIBE_SQUIRE_VK_PORT: '4000',
    });
    expect(url).toBe('http://10.0.0.1:4000');
  });

  it('accepts legacy host/port env aliases matching Vibe Kanban desktop', async () => {
    const url = await resolveVkBackendBaseUrl({
      MCP_HOST: '192.168.1.2',
      MCP_PORT: '5555',
    });
    expect(url).toBe('http://192.168.1.2:5555');
  });
});
