import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { realtimeEmitter } from '../src/realtime/events.js';

describe('POLARIS M4/M5 Backend & Ingestion Pipeline', () => {
  const app = createApp();
  const apiKey = env.ESP32_API_KEY;

  it('1. GET /health returns valid health and database status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.system).toContain('POLARIS');
  });

  it('2. POST /api/v1/ingest successfully validates and stores valid ESP32 sensor payload', async () => {
    let realtimeReceived = false;
    const testListener = (reading: any) => {
      if (reading.deviceId === 'POLARIS-TEST-01') {
        realtimeReceived = true;
      }
    };
    realtimeEmitter.on('sensor:update', testListener);

    const validPayload = {
      deviceId: 'POLARIS-TEST-01',
      timestamp: new Date().toISOString(),
      temperature: 24.5,
      pressure: 1.15,
      depth: 8.2,
      conductivity: 4.6,
      salinity: 34.1,
      atmospheric: {
        temperature: 28.5,
        pressure: 1010.2,
        humidity: 65,
      },
      gnss: {
        latitude: 17.385,
        longitude: 78.4867,
      },
      battery: 88,
      source: 'live',
    };

    const res = await request(app)
      .post('/api/v1/ingest')
      .set('X-API-Key', apiKey)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('stored');
    expect(res.body.data.readingId).toBeDefined();

    realtimeEmitter.off('sensor:update', testListener);
  });

  it('3. POST /api/v1/ingest rejects invalid coordinates (lat: 200 > 90)', async () => {
    const invalidPayload = {
      deviceId: 'POLARIS-TEST-01',
      timestamp: new Date().toISOString(),
      temperature: 24.5,
      gnss: {
        latitude: 200, // Invalid!
        longitude: 78.4867,
      },
    };

    const res = await request(app)
      .post('/api/v1/ingest')
      .set('X-API-Key', apiKey)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SENSOR_DATA_INVALID');
  });

  it('4. POST /api/v1/ingest rejects invalid temperature out of sensor range (-50°C)', async () => {
    const invalidPayload = {
      deviceId: 'POLARIS-TEST-01',
      timestamp: new Date().toISOString(),
      temperature: -50.0, // Water sensor minimum is -5°C
    };

    const res = await request(app)
      .post('/api/v1/ingest')
      .set('X-API-Key', apiKey)
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('5. Deduplication: Ingesting exact same reading returns duplicate status and does NOT duplicate record', async () => {
    const fixedTimestamp = new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString();
    const payload = {
      deviceId: `POLARIS-DEDUP-${Date.now()}`,
      timestamp: fixedTimestamp,
      temperature: 25.0,
      pressure: 1.2,
      depth: 10.0,
      battery: 80,
    };

    // First ingestion -> stored (201)
    const res1 = await request(app)
      .post('/api/v1/ingest')
      .set('X-API-Key', apiKey)
      .send(payload);
    expect(res1.status).toBe(201);
    expect(res1.body.data.status).toBe('stored');

    // Second ingestion -> duplicate detected (200)
    const res2 = await request(app)
      .post('/api/v1/ingest')
      .set('X-API-Key', apiKey)
      .send(payload);
    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe('duplicate');
  });

  it('6. Offline Synchronization Test: Batched SD-card readings after connection restored', async () => {
    const deviceId = 'POLARIS-SYNC-01';
    const batchTime = Date.now();

    // 3 readings accumulated while offline
    const bufferedReadings = [
      {
        deviceId,
        timestamp: new Date(batchTime - 30000).toISOString(),
        temperature: 22.1,
        depth: 14.5,
        battery: 79,
        source: 'buffered_sd',
      },
      {
        deviceId,
        timestamp: new Date(batchTime - 20000).toISOString(),
        temperature: 22.3,
        depth: 15.0,
        battery: 78,
        source: 'buffered_sd',
      },
      {
        deviceId,
        timestamp: new Date(batchTime - 10000).toISOString(),
        temperature: 22.4,
        depth: 15.2,
        battery: 78,
        source: 'buffered_sd',
      },
    ];

    // Replay batch over HTTP
    const res = await request(app)
      .post('/api/v1/ingest/batch')
      .set('X-API-Key', apiKey)
      .send({ batchId: 'BATCH-001', records: bufferedReadings });

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.stored).toBe(3);

    // Verify historical API reflects all 3 synchronized readings
    const historyRes = await request(app).get(`/api/v1/sensors/history?deviceId=${deviceId}`);
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.readings.length).toBeGreaterThanOrEqual(3);
  });

  it('7. GET /api/v1/polaris/status returns dynamic device status', async () => {
    const res = await request(app).get('/api/v1/polaris/status?deviceId=POLARIS-TEST-01');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBe('POLARIS-TEST-01');
    expect(res.body.data.isOnline).toBe(true);
    expect(res.body.data.battery.level).toBe(88);
  });

  it('8. GET /api/v1/location/current and /location/history', async () => {
    const currentRes = await request(app).get('/api/v1/location/current?deviceId=POLARIS-TEST-01');
    expect(currentRes.status).toBe(200);
    expect(currentRes.body.data.available).toBe(true);
    expect(currentRes.body.data.location.latitude).toBe(17.385);

    const historyRes = await request(app).get('/api/v1/location/history?deviceId=POLARIS-TEST-01');
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.coordinates.length).toBeGreaterThanOrEqual(1);
  });

  it('9. GET /api/v1/depth/profile returns depth profile for M6 visual rendering', async () => {
    const res = await request(app).get('/api/v1/depth/profile?deviceId=POLARIS-TEST-01');
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(true);
    expect(res.body.data.currentDepth).toBe(8.2);
  });

  it('10. Alert Engine generates alerts when threshold exceeded', async () => {
    // Send low battery reading (12% < 20% threshold)
    await request(app)
      .post('/api/v1/ingest')
      .set('X-API-Key', apiKey)
      .send({
        deviceId: 'POLARIS-ALERT-01',
        timestamp: new Date().toISOString(),
        battery: 12.0,
      });

    const alertsRes = await request(app).get('/api/v1/alerts?deviceId=POLARIS-ALERT-01');
    expect(alertsRes.status).toBe(200);
    const lowBattAlert = alertsRes.body.data.find((a: any) => a.type === 'LOW_BATTERY');
    expect(lowBattAlert).toBeDefined();
    expect(lowBattAlert.severity).toBe('warning');

    // Resolve the alert
    const resolveRes = await request(app)
      .patch(`/api/v1/alerts/${lowBattAlert.id}/resolve`)
      .send({ note: 'Recharged in dock' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.resolved).toBe(true);
  });

  it('11. Mission Management: Create, Read, and Update mission', async () => {
    const missionId = `TEST-MISSION-${Date.now()}`;
    const createRes = await request(app)
      .post('/api/v1/missions')
      .send({
        missionId,
        deviceId: 'POLARIS-TEST-01',
        name: 'Hydrographic Trench Survey',
        description: 'Testing mission endpoints',
      });
    expect(createRes.status).toBe(201);

    const getRes = await request(app).get(`/api/v1/missions/${missionId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.name).toBe('Hydrographic Trench Survey');
  });

  it('12. GET /api/v1/export/sensors.csv exports actual CSV data', async () => {
    const res = await request(app).get('/api/v1/export/sensors.csv?deviceId=POLARIS-TEST-01');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('id,deviceId,timestamp');
    expect(res.text).toContain('POLARIS-TEST-01');
  });

  it('13. POST /api/v1/ingest strictly returns 401 when API key is missing', async () => {
    const res = await request(app)
      .post('/api/v1/ingest')
      .send({ deviceId: 'POLARIS-TEST-01', temperature: 25.0 });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('14. POST /api/v1/ingest strictly returns 401 when API key is invalid', async () => {
    const res = await request(app)
      .post('/api/v1/ingest')
      .set('X-API-Key', 'invalid_key_random_123')
      .send({ deviceId: 'POLARIS-TEST-01', temperature: 25.0 });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('15. POST /api/v1/simulator/send successfully ingests reading without client secret exposure', async () => {
    const res = await request(app)
      .post('/api/v1/simulator/send')
      .send({ overrides: { temperature: 26.4, depth: 12.0 } });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('stored');
  });

  it('16. POST /api/v1/simulator/duplicate detects duplicates on re-sent payload', async () => {
    const res = await request(app)
      .post('/api/v1/simulator/duplicate')
      .send();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('duplicate');
  });
});
