import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { configureExpressApp } from '../src/configure-express-app';
import { PollSchedulerService } from '../src/sync/poll-scheduler.service';
import { testingAppModule } from './testing-app-module';

async function createGraphqlTestApp(): Promise<NestExpressApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [testingAppModule()],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureExpressApp(app);
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  await app.init();
  app.get(PollSchedulerService).onModuleDestroy();
  return app;
}

describe('GraphQL health (integration)', () => {
  let app: NestExpressApplication;

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
    // Apollo only serves the Sandbox HTML when Accept negotiates to text/html; otherwise
    // the request is treated as a GraphQL operation and CSRF defaults block bare GETs (400).
    const res = await request(app.getHttpServer())
      .get('/graphql')
      .set('Accept', 'text/html')
      .expect(200);
    expect(res.text).not.toContain('<div id="root">');
    expect(res.text.toLowerCase()).toMatch(/apollo|sandbox|graphql/);
  });
});
