import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { SetupEvaluationService } from './setup-evaluation.service';

/**
 * Keeps the operator on `/ui/settings` until valid PR source and work board
 * types are chosen (`integrationsConfigured`). Allows `POST /ui/setup/integration`
 * to save that choice. Further gaps (MCP stdio, routing) are shown on the
 * dashboard checklist after this gate.
 */
@Injectable()
export class UiSetupRedirectMiddleware implements NestMiddleware {
  constructor(private readonly setup: SetupEvaluationService) {}

  private allowedBeforeIntegrationsConfigured(
    path: string,
    method: string,
  ): boolean {
    if (path === '/ui/settings') {
      return true;
    }
    return path === '/ui/setup/integration' && method === 'POST';
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const raw = (req.originalUrl ?? req.url ?? '').split('?')[0];
    const path = raw.replace(/\/+$/, '') || '/';
    const method = (req.method ?? 'GET').toUpperCase();

    if (this.allowedBeforeIntegrationsConfigured(path, method)) {
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
