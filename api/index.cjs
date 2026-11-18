'use strict';

let cachedHandler = null;
let loadError = null;

function getHandler() {
  if (cachedHandler) return cachedHandler;
  if (loadError) throw loadError;
  try {
    const mod = require('./_handler.cjs');
    cachedHandler = mod && typeof mod === 'object' && mod.default ? mod.default : mod;
    if (typeof cachedHandler !== 'function') {
      throw new Error('Bundled Vercel API handler did not export a valid request function.');
    }
    return cachedHandler;
  } catch (err) {
    loadError = err;
    throw err;
  }
}

module.exports = function vercelApiEntry(req, res) {
  try {
    const handler = getHandler();
    return handler(req, res);
  } catch (err) {
    console.error('[Vercel API Fatal Startup Error]', err);
    if (res && !res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          error:
            err instanceof Error
              ? err.message
              : 'Vercel API serverless function failed to initialize.',
        })
      );
    }
  }
};
