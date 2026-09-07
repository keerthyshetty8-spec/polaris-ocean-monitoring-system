import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

import { env } from './config/env.js';
import { checkDatabaseConnection } from './config/database.js';
import { isMqttConnected } from './communication/mqtt/mqtt.client.js';
import { errorHandlerMiddleware } from './middleware/error.middleware.js';
import { handleSseConnection } from './realtime/sse.js';

// Route modules
import ingestRoutes from './routes/ingest.routes.js';
import sensorRoutes from './routes/sensor.routes.js';
import deviceRoutes from './routes/device.routes.js';
import locationRoutes from './routes/location.routes.js';
import alertRoutes from './routes/alert.routes.js';
import missionRoutes from './routes/mission.routes.js';
import exportRoutes from './routes/export.routes.js';
import simulatorRoutes from './routes/simulator.routes.js';

export function createApp(): Express {
  const app = express();

  // Basic security and CORS headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible embedding in dashboard iframe
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: env.FRONTEND_URL === '*' ? true : env.FRONTEND_URL,
      credentials: true,
    })
  );

  // Parse large JSON payloads for offline SD-card batch synchronizations
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // 1. Health Check Endpoint
  app.get('/health', async (req: Request, res: Response) => {
    const dbStatus = await checkDatabaseConnection();
    const mqttStatus = isMqttConnected();

    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        system: 'POLARIS M4/M5 Ocean Monitoring Backend',
        version: '1.0.0',
        database: dbStatus.connected ? dbStatus.provider : 'disconnected',
        mqtt: mqttStatus ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
      },
    });
  });

  // 2. Swagger / OpenAPI Documentation
  const docsPath = path.join(process.cwd(), 'docs', 'api.yaml');
  if (fs.existsSync(docsPath)) {
    try {
      const fileContents = fs.readFileSync(docsPath, 'utf8');
      const swaggerDocument = YAML.parse(fileContents);

      app.get('/api/docs/spec.yaml', (req, res) => {
        res.setHeader('Content-Type', 'text/yaml');
        res.send(fileContents);
      });

      app.get('/api/docs/spec.json', (req, res) => {
        res.json(swaggerDocument);
      });

      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } catch (err) {
      console.warn('Failed to initialize Swagger UI:', err);
    }
  }

  // 3. Realtime Server-Sent Events (SSE) Route
  app.get('/api/v1/realtime/stream', handleSseConnection);

  // 4. Ingest & Telemetry Ingestion Routes
  app.use('/api/v1', ingestRoutes);

  // 5. Query & Domain APIs
  app.use('/api/v1', sensorRoutes);
  app.use('/api/v1', deviceRoutes);
  app.use('/api/v1', locationRoutes);
  app.use('/api/v1', alertRoutes);
  app.use('/api/v1', missionRoutes);
  app.use('/api/v1', exportRoutes);
  app.use('/api/v1', simulatorRoutes);

  // 6. Global Error Handler
  app.use(errorHandlerMiddleware);

  return app;
}
