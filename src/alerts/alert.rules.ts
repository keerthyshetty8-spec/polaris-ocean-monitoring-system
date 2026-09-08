import { env } from '../config/env.js';

export interface AlertRuleCheckResult {
  triggered: boolean;
  type: 'LOW_BATTERY' | 'SENSOR_FAILURE' | 'COMMUNICATION_LOST' | 'ABNORMAL_TEMPERATURE' | 'ABNORMAL_DEPTH' | 'OUT_OF_RANGE';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  metadata?: Record<string, any>;
}

export function evaluateSensorAlertRules(reading: {
  deviceId: string;
  temperature?: number | null;
  pressure?: number | null;
  depth?: number | null;
  conductivity?: number | null;
  salinity?: number | null;
  battery?: number | null;
}): AlertRuleCheckResult[] {
  const alerts: AlertRuleCheckResult[] = [];

  // 1. Low Battery Check
  if (reading.battery !== undefined && reading.battery !== null) {
    if (reading.battery <= env.LOW_BATTERY_THRESHOLD) {
      alerts.push({
        triggered: true,
        type: 'LOW_BATTERY',
        severity: reading.battery < 10 ? 'critical' : 'warning',
        message: `Low battery level detected: ${reading.battery.toFixed(1)}% (Threshold: ${env.LOW_BATTERY_THRESHOLD}%)`,
        metadata: { current: reading.battery, threshold: env.LOW_BATTERY_THRESHOLD },
      });
    }
  }

  // 2. Abnormal Temperature Check
  if (reading.temperature !== undefined && reading.temperature !== null) {
    if (reading.temperature < env.TEMPERATURE_MIN || reading.temperature > env.TEMPERATURE_MAX) {
      alerts.push({
        triggered: true,
        type: 'ABNORMAL_TEMPERATURE',
        severity: reading.temperature < 0 || reading.temperature > 40 ? 'critical' : 'warning',
        message: `Abnormal water temperature: ${reading.temperature.toFixed(2)}°C (Configured bounds: ${env.TEMPERATURE_MIN}°C - ${env.TEMPERATURE_MAX}°C)`,
        metadata: { current: reading.temperature, min: env.TEMPERATURE_MIN, max: env.TEMPERATURE_MAX },
      });
    }
  }

  // 3. Abnormal Depth Check
  if (reading.depth !== undefined && reading.depth !== null) {
    if (reading.depth < env.DEPTH_MIN || reading.depth > env.DEPTH_MAX) {
      alerts.push({
        triggered: true,
        type: 'ABNORMAL_DEPTH',
        severity: reading.depth > env.DEPTH_MAX * 1.2 ? 'critical' : 'warning',
        message: `Abnormal depth measurement: ${reading.depth.toFixed(1)}m (Configured bounds: ${env.DEPTH_MIN}m - ${env.DEPTH_MAX}m)`,
        metadata: { current: reading.depth, min: env.DEPTH_MIN, max: env.DEPTH_MAX },
      });
    }
  }

  // 4. Out Of Range Salinity Check
  if (reading.salinity !== undefined && reading.salinity !== null) {
    if (reading.salinity < env.SALINITY_MIN || reading.salinity > env.SALINITY_MAX) {
      alerts.push({
        triggered: true,
        type: 'OUT_OF_RANGE',
        severity: 'warning',
        message: `Salinity reading out of range: ${reading.salinity.toFixed(2)} PSU (Normal marine bounds: ${env.SALINITY_MIN} - ${env.SALINITY_MAX} PSU)`,
        metadata: { current: reading.salinity, min: env.SALINITY_MIN, max: env.SALINITY_MAX },
      });
    }
  }

  // 5. Sensor Failure Check (e.g. all primary oceanographic transducers null or disconnected)
  if (
    (reading.temperature === null || reading.temperature === undefined) &&
    (reading.depth === null || reading.depth === undefined) &&
    (reading.conductivity === null || reading.conductivity === undefined) &&
    (reading.salinity === null || reading.salinity === undefined)
  ) {
    alerts.push({
      triggered: true,
      type: 'SENSOR_FAILURE',
      severity: 'critical',
      message: 'Primary marine sensor array failure: water temperature, depth, salinity, and conductivity telemetry missing',
      metadata: { deviceId: reading.deviceId },
    });
  }

  return alerts;
}
