import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import request from 'supertest';
import { configureFastifyApp } from '../src/configure-fastify-app';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';
import { testingAppModule } from './testing-app-module';

async function createGraphqlTestApp(): Promise<NestFastifyApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [testingAppModule()],
  }).compile();

  const app = moduleFixture.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter(),
  );
  await configureFastifyApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  app.get(PollSchedulerService).onModuleDestroy();
  return app;
}

describe('GraphQL health (integration)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createGraphqlTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /graphql returns health query data', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ health { ok version } }' })
      .expect(200);

    const body = res.body as {
      data?: { health?: { ok: boolean; version: string } };
      errors?: unknown[];
    };
    expect(body.errors).toBeUndefined();
    expect(body.data?.health?.ok).toBe(true);
    expect(body.data?.health?.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('GET /graphql is not served as the SPA shell', async () => {
    const res = await request(app.getHttpServer())
      .get('/graphql')
      .set('Accept', 'text/html')
      .expect(200);
    expect(res.text).not.toContain('<div id="root">');
    expect(res.text.toLowerCase()).toContain('unknown query');
  });
});
