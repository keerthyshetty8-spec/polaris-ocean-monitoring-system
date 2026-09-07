import { db } from '../config/database.js';
import { evaluateSensorAlertRules } from './alert.rules.js';
import { realtimeEmitter } from '../realtime/events.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('AlertEngine');
const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes cooldown for duplicate ongoing condition

export class AlertEngine {
  /**
   * Evaluates incoming readings, filters duplicates through a deduplicating cooldown window,
   * stores new alerts, and publishes real-time alerts to the M6 frontend.
   */
  static async processReading(reading: {
    deviceId: string;
    temperature?: number | null;
    pressure?: number | null;
    depth?: number | null;
    conductivity?: number | null;
    salinity?: number | null;
    battery?: number | null;
  }) {
    const triggeredRules = evaluateSensorAlertRules(reading);

    for (const rule of triggeredRules) {
      try {
        // Check if an unresolved alert of this type already exists for this device within the cooldown window
        const recentAlert = await db.alert.findFirst({
          where: {
            deviceId: reading.deviceId,
            type: rule.type,
            resolved: false,
          },
        });

        if (recentAlert) {
          const elapsed = Date.now() - new Date(recentAlert.timestamp).getTime();
          if (elapsed < ALERT_COOLDOWN_MS) {
            logger.debug(`Suppressed duplicate active alert for device ${reading.deviceId}, type: ${rule.type}`);
            continue;
          }
        }

        // Create new alert
        const createdAlert = await db.alert.create({
          data: {
            deviceId: reading.deviceId,
            type: rule.type,
            severity: rule.severity,
            message: rule.message,
            metadata: rule.metadata ? JSON.stringify(rule.metadata) : null,
            timestamp: new Date(),
          },
        });

        logger.warn(`ALERT CREATED [${rule.severity.toUpperCase()}]: ${rule.message}`, {
          alertId: createdAlert.id,
          deviceId: reading.deviceId,
        });

        // Broadcast real-time alert event to frontend
        realtimeEmitter.broadcast('alert:new', createdAlert);
      } catch (err: any) {
        logger.error('Failed to record alert in database', { error: err.message, rule });
      }
    }
  }

  /**
   * Helper to manually trigger an alert (e.g. COMMUNICATION_LOST or SENSOR_FAILURE)
   */
  static async triggerSystemAlert(params: {
    deviceId: string;
    type: 'COMMUNICATION_LOST' | 'SENSOR_FAILURE' | 'OUT_OF_RANGE';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    metadata?: any;
  }) {
    const createdAlert = await db.alert.create({
      data: {
        deviceId: params.deviceId,
        type: params.type,
        severity: params.severity,
        message: params.message,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        timestamp: new Date(),
      },
    });

    realtimeEmitter.broadcast('alert:new', createdAlert);
    return createdAlert;
  }
}
