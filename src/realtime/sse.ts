import { Request, Response } from 'express';
import { realtimeEmitter } from './events.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('SSE');

export function handleSseConnection(req: Request, res: Response) {
  // Prevent proxy buffering and socket timeouts
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Prevent Node HTTP socket timeout on persistent SSE connections
  req.socket?.setTimeout(0);
  req.socket?.setKeepAlive(true);

  logger.info('Frontend client connected to Realtime SSE stream');

  // Inform SSE client of retry backoff interval (3 seconds)
  res.write('retry: 3000\n\n');

  // Initial connection ping
  res.write(`data: ${JSON.stringify({ event: 'connected', message: 'POLARIS SSE Connected', timestamp: new Date().toISOString() })}\n\n`);

  let isCleanedUp = false;

  const onGlobalEvent = ({ event, data }: { event: string; data: any }) => {
    if (isCleanedUp || res.writableEnded || res.destroyed) return;
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      logger.error('Failed to write SSE event to stream', { error: (err as Error).message });
      cleanup();
    }
  };

  realtimeEmitter.on('all', onGlobalEvent);

  // Keep-alive heartbeat every 15s to keep proxy connections open
  const heartbeat = setInterval(() => {
    if (isCleanedUp || res.writableEnded || res.destroyed) {
      cleanup();
      return;
    }
    try {
      res.write(': heartbeat\n\n');
    } catch {
      cleanup();
    }
  }, 15000);

  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    clearInterval(heartbeat);
    realtimeEmitter.off('all', onGlobalEvent);

    if (!res.writableEnded && !res.destroyed) {
      try {
        res.end();
      } catch {}
    }
    logger.info('Frontend client disconnected from Realtime SSE stream');
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
}

