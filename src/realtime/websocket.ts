import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { realtimeEmitter } from './events.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('WebSocket');

export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/api/v1/realtime/ws' });

  wss.on('connection', (ws: WebSocket) => {
    logger.info('Frontend client connected via WebSocket');

    ws.send(JSON.stringify({ event: 'connected', message: 'POLARIS WebSocket Live Stream Connected' }));

    const onEvent = ({ event, data }: { event: string; data: any }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
      }
    };

    realtimeEmitter.on('all', onEvent);

    ws.on('close', () => {
      logger.info('Frontend client disconnected from WebSocket');
      realtimeEmitter.off('all', onEvent);
    });

    ws.on('error', (err) => {
      logger.error('WebSocket client error', { error: err.message });
    });
  });

  return wss;
}
