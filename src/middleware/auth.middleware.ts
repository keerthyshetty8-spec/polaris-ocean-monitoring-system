import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';

export function esp32AuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Check API Key in headers: X-API-Key or Authorization: Bearer <key>
  const rawApiKey = req.headers['x-api-key'];
  const apiKeyHeader = Array.isArray(rawApiKey) ? rawApiKey[0] : rawApiKey;
  const authHeader = Array.isArray(req.headers.authorization) ? req.headers.authorization[0] : req.headers.authorization;

  let providedKey: string | undefined;

  if (typeof apiKeyHeader === 'string') {
    providedKey = apiKeyHeader.trim();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7).trim();
  }

  // In production or when strictly configured:
  if (env.ESP32_API_KEY && env.ESP32_API_KEY.trim() !== '') {
    if (!providedKey || providedKey !== env.ESP32_API_KEY) {
      return sendError(res, 'UNAUTHORIZED', 'Invalid or missing ESP32 API Key', 401);
    }
  }

  next();
}
