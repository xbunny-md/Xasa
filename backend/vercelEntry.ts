import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from './app.ts';
import { backendLogger } from './services/logger.ts';

const app = createApiApp();

export default function vercelHandler(req: IncomingMessage, res: ServerResponse) {
  try {
    // If Vercel rewrites /api/* -> /api/index without preserving req.url in edge cases,
    // recover the original /api/... path from forwarded headers when available.
    if (req.url && req.url.startsWith('/api/index')) {
      const forwardedUri =
        (req.headers['x-vercel-original-uri'] as string | undefined) ||
        (req.headers['x-forwarded-uri'] as string | undefined) ||
        (req.headers['x-invoke-path'] as string | undefined);
      if (forwardedUri && forwardedUri.startsWith('/api/') && !forwardedUri.startsWith('/api/index')) {
        req.url = forwardedUri;
      }
    }

    return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected serverless handler error';
    backendLogger.error('API', 'VERCEL_HANDLER_ERROR', message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: message }));
    }
  }
}
