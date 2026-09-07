import { Router } from 'express';
import { IngestController } from '../controllers/ingest.controller.js';
import { esp32AuthMiddleware } from '../middleware/auth.middleware.js';
import { createRateLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();
const ingestRateLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 300 });

// HTTP Ingestion for ESP32 live & offline buffered telemetry
router.post('/ingest', ingestRateLimiter, esp32AuthMiddleware, IngestController.ingest);
router.post('/ingest/batch', ingestRateLimiter, esp32AuthMiddleware, IngestController.ingestBatch);

export default router;
