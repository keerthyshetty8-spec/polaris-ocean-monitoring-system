import { Request, Response } from 'express';
import { realtimeEmitter } from './events.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SSE');

export function handleSseConnection(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  logger.info('Frontend client connected to Realtime SSE stream');

  // Initial connection ping
  res.write(`data: ${JSON.stringify({ event: 'connected', message: 'POLARIS SSE Connected', timestamp: new Date() })}\n\n`);

  const onGlobalEvent = ({ event, data }: { event: string; data: any }) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  realtimeEmitter.on('all', onGlobalEvent);

  // Keep-alive heartbeat every 15s
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    logger.info('Frontend client disconnected from Realtime SSE stream');
    clearInterval(heartbeat);
    realtimeEmitter.off('all', onGlobalEvent);
  });
}
