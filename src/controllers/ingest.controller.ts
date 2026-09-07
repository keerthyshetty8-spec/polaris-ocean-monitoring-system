import { Request, Response } from 'express';
import { IngestionService } from '../ingestion/ingestion.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class IngestController {
  static async ingest(req: Request, res: Response) {
    const payload = req.body;

    if (!payload || typeof payload !== 'object') {
      return sendError(res, 'INVALID_PAYLOAD', 'Request body must be a valid JSON object or array', 400);
    }

    // Check if body is an array or contains records array (batch offline sync)
    if (Array.isArray(payload) || Array.isArray(payload.records)) {
      const batchResult = await IngestionService.ingestBatch(payload, 'http');
      if (!batchResult.success && batchResult.summary?.stored === 0 && batchResult.summary?.duplicates === 0) {
        return sendError(res, 'BATCH_INGESTION_FAILED', batchResult.error || 'All records were rejected', 400, batchResult.summary);
      }
      return sendSuccess(res, batchResult.summary, 200);
    }

    // Single record ingestion
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
      },
      201
    );
  }

  static async ingestBatch(req: Request, res: Response) {
    const batchResult = await IngestionService.ingestBatch(req.body, 'http');
    if (!batchResult.success && batchResult.summary?.stored === 0 && batchResult.summary?.duplicates === 0) {
      return sendError(res, 'BATCH_INGESTION_FAILED', batchResult.error || 'All records were rejected', 400, batchResult.summary);
    }
    return sendSuccess(res, batchResult.summary, 200);
  }
}
