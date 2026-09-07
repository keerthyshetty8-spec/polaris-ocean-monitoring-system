import crypto from 'crypto';

/**
 * Computes a deterministic SHA256 fingerprint from the device ID, timestamp, and core sensor readings.
 * Ensures strict idempotency during offline buffering synchronization.
 */
export function generateReadingFingerprint(params: {
  deviceId: string;
  timestamp: string | Date;
  temperature?: number | null;
  pressure?: number | null;
  depth?: number | null;
  conductivity?: number | null;
  salinity?: number | null;
  battery?: number | null;
}): string {
  const ts = params.timestamp instanceof Date ? params.timestamp.toISOString() : new Date(params.timestamp).toISOString();
  
  // Deterministic serialization of key metric attributes with fixed precision
  const payloadSummary = [
    params.deviceId,
    ts,
    params.temperature !== undefined && params.temperature !== null ? params.temperature.toFixed(2) : 'null',
    params.pressure !== undefined && params.pressure !== null ? params.pressure.toFixed(2) : 'null',
    params.depth !== undefined && params.depth !== null ? params.depth.toFixed(2) : 'null',
    params.conductivity !== undefined && params.conductivity !== null ? params.conductivity.toFixed(2) : 'null',
    params.salinity !== undefined && params.salinity !== null ? params.salinity.toFixed(2) : 'null',
    params.battery !== undefined && params.battery !== null ? params.battery.toFixed(1) : 'null',
  ].join('|');

  return crypto.createHash('sha256').update(payloadSummary).digest('hex');
}
