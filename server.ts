import http from 'http';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import { checkDatabaseConnection } from './src/config/database.js';
import { startMqttSubscriber } from './src/communication/mqtt/mqtt.subscriber.js';
import { closeMqttClient } from './src/communication/mqtt/mqtt.client.js';
import { initWebSocketServer } from './src/realtime/websocket.js';
import { createLogger } from './src/utils/logger.js';
import { Esp32Simulator } from './simulator/esp32-simulator.js';

const logger = createLogger('Server');

async function start() {
  const app = createApp();
  const server = http.createServer(app);

  // Verify database connectivity on startup
  try {
    const dbStatus = await checkDatabaseConnection();
    logger.info(`Database connectivity verified: ${dbStatus.provider}`);
  } catch (err: any) {
    logger.warn('Database connection check note:', { error: err.message });
  }

  // Initialize WebSocket streaming server on /api/v1/realtime/ws
  initWebSocketServer(server);

  // Start background MQTT subscriber for ESP32 incoming telemetry
  try {
    startMqttSubscriber();
  } catch (err: any) {
    logger.warn('MQTT subscriber could not be initialized:', { error: err.message });
  }

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = env.PORT || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`POLARIS M4/M5 Backend Server running on http://0.0.0.0:${PORT}`);
    logger.info(`REST API Root: http://0.0.0.0:${PORT}/api/v1`);
    logger.info(`OpenAPI Documentation: http://0.0.0.0:${PORT}/api/docs`);
    logger.info(`Health Endpoint: http://0.0.0.0:${PORT}/health`);
  });

  // If DATA_SOURCE=mock is enabled, seed initial readings & provide gentle background ticks
  if (env.DATA_SOURCE === 'mock') {
    logger.info('DATA_SOURCE=mock enabled: Autonomous simulation available');
    const simulator = new Esp32Simulator('POLARIS-001');
    // Initial warmup reading
    setTimeout(async () => {
      try {
        await simulator.sendHttp(simulator.generateTelemetryPayload('simulator'));
      } catch {
        // server might still be binding
      }
    }, 2000);
  }

  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);
    try {
      await closeMqttClient();
    } catch (err: any) {
      logger.warn('Error closing MQTT client during shutdown:', { error: err.message });
    }
    server.close(() => {
      logger.info('HTTP server closed cleanly.');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Shutdown timeout reached. Forcing exit.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

start().catch((err) => {
  logger.error('Fatal error starting POLARIS server', { error: err.message, stack: err.stack });
  process.exit(1);
});
