import { Esp32SensorPayload } from '../schemas/sensor.schema.js';
import { generateReadingFingerprint } from '../utils/fingerprint.js';

export interface NormalizedSensorRecord {
  deviceId: string;
  timestamp: Date;
  temperature: number | null;
  pressure: number | null;
  depth: number | null;
  conductivity: number | null;
  salinity: number | null;
  atmosphericTemp: number | null;
  atmosphericPressure: number | null;
  atmosphericHumidity: number | null;
  gnss: {
    latitude: number;
    longitude: number;
    altitude?: number;
    speed?: number;
  } | null;
  battery: number | null;
  batteryVoltage: number | null;
  source: 'live' | 'buffered_sd' | 'simulator';
  ingestionMethod: 'http' | 'mqtt';
  eventId: string | null;
  missionId: string | null;
  fingerprint: string;
}

export class PayloadMapper {
  /**
   * Normalizes raw validated ESP32 payload into internal database representation.
   * Isolates any future schema/naming adjustments from M2 firmware.
   */
  static normalize(payload: Esp32SensorPayload, method: 'http' | 'mqtt' = 'http'): NormalizedSensorRecord {
    const timestamp = new Date(payload.timestamp);

    const temperature = payload.temperature ?? null;
    const pressure = payload.pressure ?? null;
    const depth = payload.depth ?? null;
    const conductivity = payload.conductivity ?? null;
    const salinity = payload.salinity ?? null;
    const battery = payload.battery ?? null;

    const fingerprint = generateReadingFingerprint({
      deviceId: payload.deviceId,
      timestamp,
      temperature,
      pressure,
      depth,
      conductivity,
      salinity,
      battery,
    });

    return {
      deviceId: payload.deviceId,
      timestamp,
      temperature,
      pressure,
      depth,
      conductivity,
      salinity,
      atmosphericTemp: payload.atmospheric?.temperature ?? null,
      atmosphericPressure: payload.atmospheric?.pressure ?? null,
      atmosphericHumidity: payload.atmospheric?.humidity ?? null,
      gnss: payload.gnss
        ? {
            latitude: payload.gnss.latitude,
            longitude: payload.gnss.longitude,
            altitude: payload.gnss.altitude,
            speed: payload.gnss.speed,
          }
        : null,
      battery,
      batteryVoltage: payload.batteryVoltage ?? null,
      source: payload.source || 'live',
      ingestionMethod: method,
      eventId: payload.eventId ?? null,
      missionId: payload.missionId ?? null,
      fingerprint,
    };
  }
}
