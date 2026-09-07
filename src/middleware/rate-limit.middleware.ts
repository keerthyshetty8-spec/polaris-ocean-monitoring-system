import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.js';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientRecord = requests.get(key);

    if (!clientRecord || now > clientRecord.resetAt) {
      requests.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (clientRecord.count >= options.maxRequests) {
      return sendError(
        res,
        'RATE_LIMIT_EXCEEDED',
        'Too many requests, please try again later',
        429,
        { retryAfterMs: clientRecord.resetAt - now }
      );
    }

    clientRecord.count++;
    next();
  };
}
