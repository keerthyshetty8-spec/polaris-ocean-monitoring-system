import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

const logger = createLogger('ErrorHandler');

export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error('Unhandled request exception', {
    url: req.originalUrl,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An internal server error occurred';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  return sendError(res, code, message, statusCode);
}
