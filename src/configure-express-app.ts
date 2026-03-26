import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import hbs from 'hbs';

const UI_LAYOUT_MARKER = join('views', 'partials', 'layout.hbs');

/**
 * Nest emits JS under `dist/src/` but copies assets to `dist/ui/`.
 * A stale empty `dist/src/ui` directory must not win over `dist/ui/`.
 * ts-jest keeps assets under `src/ui/` next to `src/*.ts`.
 */
function resolveUiRoot(): string {
  const siblingUi = join(__dirname, '..', 'ui');
  const coLocatedUi = join(__dirname, 'ui');

  if (existsSync(join(siblingUi, UI_LAYOUT_MARKER))) {
    return siblingUi;
  }
  if (existsSync(join(coLocatedUi, UI_LAYOUT_MARKER))) {
    return coLocatedUi;
  }
  return siblingUi;
}

/**
 * View engine, static UI assets, and form body parsing.
 * Shared by `main.ts` and e2e bootstrap so `/ui/*` works everywhere.
 */
export function configureExpressApp(app: NestExpressApplication): void {
  app.use(express.urlencoded({ extended: true }));

  const uiRoot = resolveUiRoot();
  const viewsPath = join(uiRoot, 'views');
  const publicPath = join(uiRoot, 'public');
  const partialsDir = join(viewsPath, 'partials');

  hbs.registerPartial(
    'layout',
    readFileSync(join(partialsDir, 'layout.hbs'), 'utf8'),
  );
  hbs.registerPartial(
    'nav',
    readFileSync(join(partialsDir, 'nav.hbs'), 'utf8'),
  );
  hbs.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  /**
   * Handlebars invokes @partial-block via `lambda`, which only sets `this` and
   * does not pass the layout context as the first argument. The inner program
   * then runs with `undefined` context (empty snapshot in dashboard, broken
   * `manualSync`). Render the block with the current (layout) context explicitly.
   */
  hbs.registerHelper(
    'renderBlock',
    function (
      this: unknown,
      options: {
        data?: { 'partial-block'?: (ctx: unknown, opts: unknown) => string };
      },
    ) {
      const block = options.data?.['partial-block'];
      return typeof block === 'function' ? block(this, options) : '';
    },
  );
  hbs.registerHelper('json', (context: unknown) =>
    JSON.stringify(context ?? null).replace(/</g, '\\u003c'),
  );

  app.useStaticAssets(publicPath, { prefix: '/ui/assets/' });
  app.setBaseViewsDir(viewsPath);
  app.setViewEngine('hbs');
}
