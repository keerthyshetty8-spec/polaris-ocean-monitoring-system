import { db } from '../config/database.js';
import { PayloadValidator } from './payload.validator.js';
import { PayloadMapper, NormalizedSensorRecord } from './payload.mapper.js';
import { AlertEngine } from '../alerts/alert.engine.js';
import { realtimeEmitter } from '../realtime/events.js';
import { createLogger } from '../utils/logger.js';
import { Esp32SensorPayload } from '../schemas/sensor.schema.js';

const logger = createLogger('IngestionService');

export interface IngestionOutcome {
  success: boolean;
  status: 'stored' | 'duplicate' | 'rejected';
  readingId?: string;
  fingerprint?: string;
  deviceId?: string;
  error?: string;
}

export class IngestionService {
  /**
   * Ingests a single ESP32 sensor payload.
   * Handles validation, normalization, idempotency/deduplication,
   * database storage, location tracking, alert checks, and real-time frontend broadcasts.
   */
  static async ingestSingle(rawPayload: any, method: 'http' | 'mqtt' = 'http'): Promise<IngestionOutcome> {
    // 1. Validation
    const validation = PayloadValidator.validateSinglePayload(rawPayload);
    if (!validation.success || !validation.data) {
      logger.warn('Sensor payload failed validation', { errors: validation.errors, payload: rawPayload });
      return {
        success: false,
        status: 'rejected',
        error: validation.errors?.join(', ') || 'Payload validation failed',
      };
    }

    const payload: Esp32SensorPayload = validation.data;

    // 2. Normalization & Fingerprinting
    const normalized: NormalizedSensorRecord = PayloadMapper.normalize(payload, method);

    try {
      // 3. Upsert Device Status
      const device = await db.device.upsert({
        where: { deviceId: normalized.deviceId },
        create: {
          deviceId: normalized.deviceId,
          name: `POLARIS Unit (${normalized.deviceId})`,
          status: 'online',
          lastSeen: new Date(),
        },
        update: {
          status: 'online',
          lastSeen: new Date(),
        },
      });

      // 4. Deduplication Check (Idempotency)
      const existingReading = await db.sensorReading.findUnique({
        where: {
          deviceId_fingerprint: {
            deviceId: normalized.deviceId,
            fingerprint: normalized.fingerprint,
          },
        },
      });

      if (existingReading) {
        logger.info(`Duplicate reading detected and skipped for device ${normalized.deviceId}`, {
          fingerprint: normalized.fingerprint,
          timestamp: normalized.timestamp,
        });

        // Record sync event as duplicate
        await db.syncRecord.create({
          data: {
            deviceId: normalized.deviceId,
            eventId: normalized.eventId,
            fingerprint: normalized.fingerprint,
            status: 'duplicate',
            recordsCount: 1,
            receivedAt: new Date(),
            syncedAt: new Date(),
          },
        });

        return {
          success: true,
          status: 'duplicate',
          readingId: existingReading.id,
          fingerprint: normalized.fingerprint,
          deviceId: normalized.deviceId,
        };
      }

      // 5. Store Sensor Reading in Database
      const reading = await db.sensorReading.create({
        data: {
          deviceId: normalized.deviceId,
          timestamp: normalized.timestamp,
          temperature: normalized.temperature,
          pressure: normalized.pressure,
          depth: normalized.depth,
          conductivity: normalized.conductivity,
          salinity: normalized.salinity,
          atmosphericTemp: normalized.atmosphericTemp,
          atmosphericPressure: normalized.atmosphericPressure,
          atmosphericHumidity: normalized.atmosphericHumidity,
          battery: normalized.battery,
          batteryVoltage: normalized.batteryVoltage,
          source: normalized.source,
          ingestionMethod: normalized.ingestionMethod,
          eventId: normalized.eventId,
          fingerprint: normalized.fingerprint,
          missionId: normalized.missionId,
        },
      });

      // 6. GNSS Location Tracking
      let savedLocation = null;
      if (normalized.gnss) {
        savedLocation = await db.location.create({
          data: {
            deviceId: normalized.deviceId,
            latitude: normalized.gnss.latitude,
            longitude: normalized.gnss.longitude,
            altitude: normalized.gnss.altitude ?? null,
            speed: normalized.gnss.speed ?? null,
            timestamp: normalized.timestamp,
            missionId: normalized.missionId,
          },
        });
      }

      // 7. Communication Status Record
      const commStatus = await db.communicationStatus.create({
        data: {
          deviceId: normalized.deviceId,
          protocol: method.toUpperCase(),
          status: 'connected',
          lastSeen: new Date(),
          timestamp: new Date(),
          details: JSON.stringify({ source: normalized.source, method }),
        },
      });

      // 8. Sync Record (Success)
      await db.syncRecord.create({
        data: {
          deviceId: normalized.deviceId,
          eventId: normalized.eventId,
          fingerprint: normalized.fingerprint,
          status: 'success',
          recordsCount: 1,
          receivedAt: new Date(),
          syncedAt: new Date(),
        },
      });

      // 9. Alert Engine Evaluation
      await AlertEngine.processReading({
        deviceId: normalized.deviceId,
        temperature: normalized.temperature,
        pressure: normalized.pressure,
        depth: normalized.depth,
        conductivity: normalized.conductivity,
        salinity: normalized.salinity,
        battery: normalized.battery,
      });

      // 10. Real-time Delivery to Frontend
      realtimeEmitter.broadcast('sensor:update', reading);
      realtimeEmitter.broadcast('device:update', {
        deviceId: device.deviceId,
        status: device.status,
        lastSeen: device.lastSeen,
        battery: normalized.battery,
      });
      if (savedLocation) {
        realtimeEmitter.broadcast('location:update', savedLocation);
      }
      realtimeEmitter.broadcast('communication:update', commStatus);

      logger.info(`Successfully ingested reading for ${normalized.deviceId}`, {
        readingId: reading.id,
        method,
        source: normalized.source,
      });

      return {
        success: true,
        status: 'stored',
        readingId: reading.id,
        fingerprint: normalized.fingerprint,
        deviceId: normalized.deviceId,
      };
    } catch (err: any) {
      logger.error('Failed to store reading into database', { error: err.message, payload });
      return {
        success: false,
        status: 'rejected',
        error: err.message || 'Database ingestion error',
      };
    }
  }

  /**
   * Ingests a batch of buffered readings (e.g. from SD-card after network reconnection).
   * Processes each record with deduplication and reports summary statistics.
   */
  static async ingestBatch(rawBatch: any, method: 'http' | 'mqtt' = 'http') {
    const records = Array.isArray(rawBatch) ? rawBatch : rawBatch.records;
    if (!Array.isArray(records) || records.length === 0) {
      return {
        success: false,
        error: 'Batch must contain a non-empty records array',
      };
    }

    const results = {
      total: records.length,
      stored: 0,
      duplicates: 0,
      rejected: 0,
      details: [] as IngestionOutcome[],
    };

    for (const record of records) {
      // Flag as buffered if not explicitly stated
      if (!record.source) {
        record.source = 'buffered_sd';
      }
      const outcome = await this.ingestSingle(record, method);
      results.details.push(outcome);
      if (outcome.status === 'stored') results.stored++;
      else if (outcome.status === 'duplicate') results.duplicates++;
      else results.rejected++;
    }

    logger.info('Batch ingestion completed', {
      total: results.total,
      stored: results.stored,
      duplicates: results.duplicates,
      rejected: results.rejected,
    });

    return {
      success: results.stored + results.duplicates > 0,
      summary: {
        total: results.total,
        stored: results.stored,
        duplicates: results.duplicates,
        rejected: results.rejected,
      },
    };
  }
}
