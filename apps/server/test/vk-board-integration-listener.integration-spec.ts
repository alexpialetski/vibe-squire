import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { testingAppModule } from './testing-app-module';
import { VibeKanbanBoardService } from '../src/vibe-kanban/vibe-kanban-board.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { SettingsService } from '../src/settings/settings.service';
import { SyncRunStateService } from '../src/sync/sync-run-state.service';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';

function buildVkStub() {
  return {
    probe: jest.fn().mockResolvedValue(undefined),
    listOrganizations: jest.fn().mockResolvedValue([]),
    listProjects: jest.fn().mockResolvedValue([]),
    listRepos: jest.fn().mockResolvedValue([]),
    listIssues: jest.fn().mockResolvedValue([]),
    countActiveVibeSquireIssues: jest.fn().mockResolvedValue(0),
    getIssue: jest.fn().mockResolvedValue(null),
    createIssue: jest.fn().mockResolvedValue('fake-issue-id'),
    updateIssue: jest.fn().mockResolvedValue(undefined),
    startWorkspace: jest.fn().mockResolvedValue('ws-1'),
  };
}

/**
 * Vibe Kanban destination listener + IntegrationSettingsEmitter path.
 */
describe('VkBoardIntegrationListener (integration)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let settings: SettingsService;
  let runState: SyncRunStateService;
  let vkStub: ReturnType<typeof buildVkStub>;

  beforeAll(async () => {
    vkStub = buildVkStub();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testingAppModule()],
    })
      .overrideProvider(VibeKanbanBoardService)
      .useValue(vkStub)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
    settings = app.get(SettingsService);
    runState = app.get(SyncRunStateService);

    await prisma.setting.deleteMany({
      where: {
        key: {
          in: ['scheduled_sync_enabled'],
        },
      },
    });
    await prisma.setting.create({
      data: { key: 'scheduled_sync_enabled', value: 'false' },
    });
    await settings.refreshCache();

    const scheduler = app.get(PollSchedulerService);
    scheduler.onModuleDestroy();

    expect(vkStub.probe).toHaveBeenCalled();
    expect(runState.getDestinationHealth('vibe_kanban').state).toBe('ok');
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vkStub.probe.mockClear();
    vkStub.probe.mockResolvedValue(undefined);
  });

  it('PATCH destination rejects unknown keys (strict schema)', async () => {
    await expect(
      settings.applyGroupPatch('destination', {
        not_a_valid_destination_setting: 'x',
      }),
    ).rejects.toThrow(/unknown|unrecognized|invalid/i);
  });

  it('integration-settings event with healthy VK: probe failure → degraded if lastOkAt set', async () => {
    vkStub.probe.mockRejectedValueOnce(new Error('probe transient'));

    await settings.applyGroupPatch('core', { poll_interval_minutes: '12' });

    const h = runState.getDestinationHealth('vibe_kanban');
    expect(h.state).toBe('degraded');
    expect(h.message).toContain('probe transient');
    expect(h.lastOkAt).toBeDefined();
  });

  it('PATCH destination_type is rejected (not a persisted setting key)', async () => {
    await expect(
      settings.applyGroupPatch('core', { destination_type: '' }),
    ).rejects.toThrow(/unknown|unrecognized|invalid/i);
  });
});
