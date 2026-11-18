import handler from './_handler.mjs';

export default function vercelApiEntry(req, res) {
  try {
    return handler(req, res);
  } catch (err) {
    console.error('[Vercel API Fatal Error]', err);
    if (res && !res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error:
            err instanceof Error
              ? err.message
              : 'Vercel API serverless function failed to process request.',
        })
      );
    }
  }
}
