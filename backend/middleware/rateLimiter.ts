import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

function extractClientIp(req: Request): string {
  const vercelForwarded = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelForwarded === 'string' && vercelForwarded.trim()) {
    const first = vercelForwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }

  const forwarded = req.headers.forwarded;
  if (typeof forwarded === 'string') {
    const match = forwarded.match(/for="?\[?([^;,\s"\]]+)/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

function clientKeyGenerator(req: Request): string {
  return ipKeyGenerator(extractClientIp(req));
}

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 90,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: clientKeyGenerator,
  message: {
    error: 'Too many requests to the odds proxy. Please pause briefly before rescanning.',
  },
});

export const bookingCodeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: clientKeyGenerator,
  message: {
    error: 'Booking code rate limit reached. Please wait a minute before generating more codes.',
  },
});
