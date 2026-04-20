import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

const CLIENT_INDEX = 'index.html';

/**
 * Nest emits `dist/main.js`; SPA static files live in `dist/client/` (copied from
 * `apps/web/dist` via nest-cli assets). Under ts-jest, `__dirname` may be `src/`.
 */
function resolveClientRoot(): string {
  const distClient = join(__dirname, 'client');
  const distSiblingClient = join(__dirname, '..', 'client');
  const monorepoDev = join(__dirname, '../../web/dist');

  if (existsSync(join(distClient, CLIENT_INDEX))) {
    return distClient;
  }
  if (existsSync(join(distSiblingClient, CLIENT_INDEX))) {
    return distSiblingClient;
  }
  if (existsSync(join(monorepoDev, CLIENT_INDEX))) {
    return monorepoDev;
  }
  return distClient;
}

/**
 * Express body parsing + SPA static assets (no Handlebars).
 * Shared by `main.ts` and integration HTTP tests.
 */
export function configureExpressApp(app: NestExpressApplication): void {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const clientRoot = resolveClientRoot();

  app.use(
    express.static(clientRoot, {
      maxAge: '1h',
      index: CLIENT_INDEX,
      fallthrough: true,
    }),
  );

  const spaFallback: express.RequestHandler = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    const p = req.path;
    if (p.startsWith('/api') || p.startsWith('/graphql')) {
      next();
      return;
    }
    const indexPath = join(clientRoot, CLIENT_INDEX);
    if (!existsSync(indexPath)) {
      next();
      return;
    }
    res.sendFile(indexPath);
  };

  app.use(spaFallback);
}
