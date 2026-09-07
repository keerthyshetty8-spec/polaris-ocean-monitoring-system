import { describe, it, expect } from 'vitest';
import { IngestionService } from '../src/ingestion/ingestion.service.js';
import { realtimeEmitter } from '../src/realtime/events.js';

describe('POLARIS M4/M5 MQTT Ingestion Processing', () => {
  it('Processes MQTT telemetry message, triggers deduplication, and emits realtime update', async () => {
    let capturedEvent: any = null;
    const listener = (data: any) => {
      if (data.deviceId === 'POLARIS-MQTT-01') {
        capturedEvent = data;
      }
    };
    realtimeEmitter.on('sensor:update', listener);

    const mqttPayload = {
      deviceId: 'POLARIS-MQTT-01',
      timestamp: new Date().toISOString(),
      temperature: 26.8,
      pressure: 1.18,
      depth: 9.4,
      conductivity: 4.82,
      salinity: 34.5,
      atmospheric: {
        temperature: 29.5,
        pressure: 1011.0,
        humidity: 68,
      },
      gnss: {
        latitude: 17.385,
        longitude: 78.4867,
      },
      battery: 92,
      source: 'live',
    };

    const outcome = await IngestionService.ingestSingle(mqttPayload, 'mqtt');
    expect(outcome.success).toBe(true);
    expect(outcome.status).toBe('stored');
    expect(capturedEvent).not.toBeNull();
    expect(capturedEvent.temperature).toBe(26.8);

    // Verify duplicate MQTT payload handling (e.g. QoS 1 re-delivery)
    const duplicateOutcome = await IngestionService.ingestSingle(mqttPayload, 'mqtt');
    expect(duplicateOutcome.success).toBe(true);
    expect(duplicateOutcome.status).toBe('duplicate');

    realtimeEmitter.off('sensor:update', listener);
  });
});
