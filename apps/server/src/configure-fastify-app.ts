import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

const CLIENT_INDEX = 'index.html';

/**
 * Nest emits `dist/main.js`; SPA static files live in `dist/client/` (copied from
 * `apps/web/dist` via nest-cli assets). Under ts-jest, `__dirname` may be `src/`,
 * so integration tests should prebuild `apps/web` and use the monorepo fallback.
 */
function resolveClientRoot(): string {
  const distClient = join(__dirname, 'client');
  const monorepoDev = join(__dirname, '../../web/dist');

  if (existsSync(join(distClient, CLIENT_INDEX))) {
    return distClient;
  }
  if (existsSync(join(monorepoDev, CLIENT_INDEX))) {
    return monorepoDev;
  }
  return distClient;
}

function shouldSkipSpaFallback(
  pathname: string,
  nodeEnv: string | undefined,
): boolean {
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return true;
  }
  if (pathname === '/graphql' || pathname.startsWith('/graphql/')) {
    return true;
  }
  if (nodeEnv !== 'production' && pathname.startsWith('/graphiql')) {
    return true;
  }
  return false;
}

/**
 * Fastify static assets + SPA fallback for deep links.
 * Shared by `main.ts` and integration HTTP tests.
 */
export async function configureFastifyApp(
  app: NestFastifyApplication,
): Promise<void> {
  const clientRoot = resolveClientRoot();
  const indexPath = join(clientRoot, CLIENT_INDEX);
  const indexHtml = existsSync(indexPath)
    ? readFileSync(indexPath, 'utf8')
    : null;

  await app.register(fastifyStatic, {
    root: clientRoot,
    prefix: '/',
    wildcard: false,
    maxAge: '1h',
  });

  const instance = app.getHttpAdapter().getInstance();
  instance.addHook('onRequest', (req, reply, done) => {
    const method = req.method;
    const pathname = req.url.split('?')[0] ?? '/';
    const hasFileExtension = pathname.includes('.');

    if (
      (method !== 'GET' && method !== 'HEAD') ||
      shouldSkipSpaFallback(pathname, process.env.NODE_ENV) ||
      hasFileExtension ||
      indexHtml === null
    ) {
      done();
      return;
    }

    reply.type('text/html; charset=utf-8').send(indexHtml);
    done();
  });
}
