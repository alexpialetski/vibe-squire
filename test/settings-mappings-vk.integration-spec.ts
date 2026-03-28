import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { testingAppModule } from './testing-app-module';
import { VibeKanbanMcpService } from '../src/vibe-kanban/vibe-kanban-mcp.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Settings, mappings, vibe-kanban (integration)', () => {
  let app: INestApplication<App>;
  const vkStub = {
    probe: jest.fn().mockResolvedValue(undefined),
    listOrganizations: jest
      .fn()
      .mockResolvedValue([{ id: 'org-1', name: 'Acme' }]),
    listProjects: jest.fn().mockResolvedValue([{ id: 'proj-1', name: 'Main' }]),
    listRepos: jest
      .fn()
      .mockResolvedValue([{ id: 'repo-1', name: 'Acme Repo' }]),
    listIssues: jest.fn().mockResolvedValue([]),
    countActiveVibeSquireIssues: jest.fn().mockResolvedValue(0),
    getIssue: jest.fn().mockResolvedValue(null),
    createIssue: jest.fn().mockResolvedValue('fake-issue-id'),
    updateIssue: jest.fn().mockResolvedValue(undefined),
    startWorkspace: jest.fn().mockResolvedValue('ws-1'),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testingAppModule()],
    })
      .overrideProvider(VibeKanbanMcpService)
      .useValue(vkStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.repoProjectMapping.deleteMany();
    await prisma.setting.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH /api/settings then GET returns merged values', async () => {
    await request(app.getHttpServer())
      .patch('/api/settings/core')
      .send({ poll_interval_minutes: '7' })
      .expect(200);

    await request(app.getHttpServer())
      .patch('/api/settings/destination')
      .send({ kanban_done_status: 'Closed' })
      .expect(200);

    const res = await request(app.getHttpServer())
      .get('/api/settings')
      .expect(200);

    const body = res.body as Record<string, string>;
    expect(body.poll_interval_minutes).toBe('7');
    expect(body.kanban_done_status).toBe('Closed');
  });

  it('mappings CRUD happy path', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/mappings')
      .send({
        githubRepo: 'acme/demo',
        vibeKanbanRepoId: 'repo-uuid-1',
        label: 'Demo',
      })
      .expect(201);

    const createdBody = created.body as { githubRepo: string };
    expect(createdBody.githubRepo).toBe('acme/demo');

    const list = await request(app.getHttpServer())
      .get('/api/mappings')
      .expect(200);
    const listBody = list.body as { id: string }[];
    expect(listBody).toHaveLength(1);

    const id = listBody[0].id;
    await request(app.getHttpServer())
      .patch(`/api/mappings/${id}`)
      .send({ label: 'Updated' })
      .expect(200);

    const after = await request(app.getHttpServer())
      .get('/api/mappings')
      .expect(200);
    const afterBody = after.body as { label: string | null }[];
    expect(afterBody[0].label).toBe('Updated');

    await request(app.getHttpServer())
      .delete(`/api/mappings/${id}`)
      .expect(200);
    const empty = await request(app.getHttpServer())
      .get('/api/mappings')
      .expect(200);
    expect(empty.body as unknown[]).toHaveLength(0);
  });

  it('GET /api/vibe-kanban/repos uses MCP stub', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/vibe-kanban/repos')
      .expect(200);
    const body = res.body as { repos: { id: string; name: string }[] };
    expect(body.repos).toEqual([{ id: 'repo-1', name: 'Acme Repo' }]);
    expect(vkStub.listRepos).toHaveBeenCalled();
  });

  it('GET /api/vibe-kanban/organizations uses MCP stub', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/vibe-kanban/organizations')
      .expect(200);
    const orgBody = res.body as {
      organizations: { id: string; name: string }[];
    };
    expect(orgBody.organizations).toEqual([{ id: 'org-1', name: 'Acme' }]);
    expect(vkStub.listOrganizations).toHaveBeenCalled();
  });
});

describe('Vibe Kanban context when destination not configured (integration)', () => {
  let app: INestApplication<App>;
  /** `parseAppEnv` snapshot does not drive `vk_mcp_stdio_json`; {@link SettingsService.getEffective} reads `process.env.VK_MCP_STDIO_JSON`. */
  let prevVkMcpStdioJson: string | undefined;

  beforeAll(async () => {
    prevVkMcpStdioJson = process.env.VK_MCP_STDIO_JSON;
    process.env.VK_MCP_STDIO_JSON = '[]';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testingAppModule()],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    if (prevVkMcpStdioJson === undefined) {
      delete process.env.VK_MCP_STDIO_JSON;
    } else {
      process.env.VK_MCP_STDIO_JSON = prevVkMcpStdioJson;
    }
  });

  it('GET /api/vibe-kanban/organizations returns 400', async () => {
    await request(app.getHttpServer())
      .get('/api/vibe-kanban/organizations')
      .expect(400);
  });
});
