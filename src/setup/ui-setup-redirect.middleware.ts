import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { SetupEvaluationService } from './setup-evaluation.service';

/**
 * Redirects the operator dashboard to `/ui/settings` until a valid PR source and
 * work board are chosen. Further gaps (MCP stdio, routing) are shown on the
 * dashboard checklist.
 */
@Injectable()
export class UiSetupRedirectMiddleware implements NestMiddleware {
  constructor(private readonly setup: SetupEvaluationService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const raw = (req.originalUrl ?? req.url ?? '').split('?')[0];
    const path = raw.replace(/\/+$/, '') || '/';
    const isDashboard = path === '/ui' || path === '/ui/dashboard';

    if (!isDashboard) {
      next();
      return;
    }

    const ev = await this.setup.evaluate();
    if (ev.integrationsConfigured) {
      next();
      return;
    }

    res.redirect(302, '/ui/settings');
  }
}
