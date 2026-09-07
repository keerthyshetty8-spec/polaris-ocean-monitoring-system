import { Router, Request, Response } from 'express';
import { Esp32Simulator } from '../../simulator/esp32-simulator.js';
import { IngestionService } from '../ingestion/ingestion.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();
const simulator = new Esp32Simulator('POLARIS-001');

// Cache the last generated or sent payload for duplicate testing
let lastSimulatorPayload: any = null;

/**
 * POST /api/v1/simulator/send
 * Sends a simulated ESP32 reading using the server-side ingestion pipeline.
 * Does not expose ESP32_API_KEY to the client bundle.
 */
router.post('/simulator/send', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    let payload = body.payload;

    if (!payload) {
      const overrides = body.overrides || (body.temperature !== undefined || body.battery !== undefined ? body : undefined);
      const generated = simulator.generateTelemetryPayload('live');
      payload = overrides ? { ...generated, ...overrides } : generated;
    }

    lastSimulatorPayload = payload;

    const outcome = await IngestionService.ingestSingle(payload, 'http');

    if (!outcome.success || outcome.status === 'rejected') {
      return sendError(res, 'SENSOR_DATA_INVALID', outcome.error || 'Sensor payload failed validation', 400);
    }

    if (outcome.status === 'duplicate') {
      return sendSuccess(
        res,
        {
          status: 'duplicate',
          message: 'Payload previously ingested. Skipped duplicate record.',
          readingId: outcome.readingId,
          fingerprint: outcome.fingerprint,
        },
        200
      );
    }

    return sendSuccess(
      res,
      {
        status: 'stored',
        message: 'Sensor reading successfully ingested and stored',
        readingId: outcome.readingId,
        fingerprint: outcome.fingerprint,
        reading: payload,
      },
      201
    );
  } catch (err: any) {
    return sendError(res, 'SIMULATION_ERROR', err.message || 'Failed to simulate ESP32 reading', 500);
  }
});

/**
 * POST /api/v1/simulator/batch
 * Simulates an offline SD-card batch synchronization with 3 readings.
 */
router.post('/simulator/batch', async (req: Request, res: Response) => {
  try {
    let records = req.body?.records;

    if (!records || !Array.isArray(records) || records.length === 0) {
      const now = Date.now();
      records = [1, 2, 3].map((i) => {
        const pastTime = new Date(now - (4 - i) * 60000);
        return simulator.generateTelemetryPayload('buffered_sd', pastTime);
      });
    }

    const batchPayload = {
      batchId: req.body?.batchId || `OFFLINE-SYNC-${Date.now()}`,
      records,
    };

    const batchResult = await IngestionService.ingestBatch(batchPayload, 'http');

    if (!batchResult.success && batchResult.summary?.stored === 0 && batchResult.summary?.duplicates === 0) {
      return sendError(res, 'BATCH_INGESTION_FAILED', batchResult.error || 'All records were rejected', 400, batchResult.summary);
    }

    return sendSuccess(res, batchResult.summary, 200);
  } catch (err: any) {
    return sendError(res, 'SIMULATION_ERROR', err.message || 'Failed to simulate offline batch', 500);
  }
});

/**
 * POST /api/v1/simulator/duplicate
 * Re-sends the last ingested reading to verify deduplication.
 */
router.post('/simulator/duplicate', async (req: Request, res: Response) => {
  try {
    const payload = req.body?.payload || lastSimulatorPayload || simulator.generateTelemetryPayload('live');
    const outcome = await IngestionService.ingestSingle(payload, 'http');

    if (outcome.status === 'duplicate') {
      return sendSuccess(
        res,
        {
          status: 'duplicate',
          message: 'Payload previously ingested. Skipped duplicate record.',
          readingId: outcome.readingId,
          fingerprint: outcome.fingerprint,
        },
        200
      );
    }

    return sendSuccess(
      res,
      {
        status: outcome.status,
        message: 'Record ingested',
        readingId: outcome.readingId,
        fingerprint: outcome.fingerprint,
      },
      200
    );
  } catch (err: any) {
    return sendError(res, 'SIMULATION_ERROR', err.message || 'Failed to simulate duplicate reading', 500);
  }
});

export default router;
