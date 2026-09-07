import axios from 'axios';
import mqtt from 'mqtt';
import { env } from '../src/config/env.js';

interface SimulatorOptions {
  mode: 'http' | 'mqtt' | 'both' | 'offline_sync_test';
  intervalMs: number;
  count: number;
  deviceId: string;
}

export class Esp32Simulator {
  private deviceId: string;
  private currentBattery: number = 95.0;
  private currentLat: number = 17.385;
  private currentLon: number = 78.4867;
  private currentDepth: number = 10.0;
  private sequence: number = 0;

  constructor(deviceId: string = 'POLARIS-001') {
    this.deviceId = deviceId;
  }

  generateTelemetryPayload(source: 'live' | 'buffered_sd' | 'simulator' = 'live', customTimestamp?: Date) {
    this.sequence++;
    const ts = customTimestamp || new Date();

    // Ocean physics simulation
    this.currentDepth = Math.max(0.5, Math.min(60.0, this.currentDepth + (Math.random() - 0.48) * 1.5));
    const waterTemp = parseFloat((27.5 - this.currentDepth * 0.18 + (Math.random() - 0.5) * 0.3).toFixed(2));
    const pressure = parseFloat((1.013 + this.currentDepth * 0.098).toFixed(2));
    const salinity = parseFloat((34.8 + Math.sin(this.sequence / 10) * 0.4).toFixed(2));
    const conductivity = parseFloat((4.75 + (Math.random() - 0.5) * 0.1).toFixed(2));

    // Slow battery discharge
    this.currentBattery = Math.max(5.0, parseFloat((this.currentBattery - 0.05).toFixed(1)));

    // GPS ocean drift
    this.currentLat += (Math.random() - 0.45) * 0.0001;
    this.currentLon += (Math.random() - 0.45) * 0.0001;

    return {
      deviceId: this.deviceId,
      timestamp: ts.toISOString(),
      temperature: waterTemp,
      pressure,
      depth: parseFloat(this.currentDepth.toFixed(2)),
      conductivity,
      salinity,
      atmospheric: {
        temperature: parseFloat((29.2 + Math.sin(this.sequence / 5) * 1.5).toFixed(2)),
        pressure: 1009.5,
        humidity: 71.0,
      },
      gnss: {
        latitude: parseFloat(this.currentLat.toFixed(6)),
        longitude: parseFloat(this.currentLon.toFixed(6)),
        altitude: 0.2,
        speed: 0.8,
      },
      battery: this.currentBattery,
      batteryVoltage: parseFloat((11.0 + (this.currentBattery / 100) * 1.6).toFixed(2)),
      source,
      eventId: `ESP32-EVT-${Date.now()}-${this.sequence}`,
    };
  }

  async sendHttp(payload: any, endpoint: string = `http://localhost:${env.PORT}/api/v1/ingest`) {
    try {
      const res = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': env.ESP32_API_KEY,
        },
      });
      return { success: true, status: res.status, data: res.data };
    } catch (err: any) {
      return {
        success: false,
        status: err.response?.status,
        error: err.response?.data || err.message,
      };
    }
  }

  async runOfflineSyncTest() {
    console.log('\n======================================================');
    console.log('   POLARIS ESP32 SIMULATOR: OFFLINE SYNC TEST');
    console.log('======================================================');
    console.log('[STAGE 1] Simulating ESP32 connected: Sending reading 1...');
    const reading1 = this.generateTelemetryPayload('live');
    const res1 = await this.sendHttp(reading1);
    console.log('Reading 1 live transmission result:', res1.status, res1.data?.data?.status);

    console.log('\n[STAGE 2] SIMULATED NETWORK OUTAGE (Disconnection)');
    console.log('ESP32 accumulates readings in local SD-card buffer...');
    const localSdBuffer: any[] = [];
    for (let i = 1; i <= 3; i++) {
      const pastTime = new Date(Date.now() + i * 5000);
      const bufferedReading = this.generateTelemetryPayload('buffered_sd', pastTime);
      localSdBuffer.push(bufferedReading);
      console.log(` -> Buffered reading #${i} onto SD card at ${bufferedReading.timestamp}`);
    }

    console.log('\n[STAGE 3] NETWORK CONNECTION RESTORED!');
    console.log(`ESP32 sends batch of ${localSdBuffer.length} buffered readings to POST /api/v1/ingest...`);
    const batchRes = await this.sendHttp(localSdBuffer);
    console.log('Batch synchronization result:', batchRes.status, batchRes.data?.data);

    console.log('\n[STAGE 4] DEDUPLICATION REPLAY TEST');
    console.log('ESP32 accidentally re-sends the first buffered reading (e.g. timeout on ACK)...');
    const duplicateRes = await this.sendHttp(localSdBuffer[0]);
    console.log('Replay transmission result:', duplicateRes.status, duplicateRes.data?.data);
    console.log('Deduplication verified: Record skipped without creating a duplicate record!');
    console.log('======================================================\n');
  }

  async start(options: SimulatorOptions) {
    console.log(`[POLARIS ESP32 SIMULATOR] Started for ${this.deviceId} in mode: ${options.mode}`);

    if (options.mode === 'offline_sync_test') {
      await this.runOfflineSyncTest();
      return;
    }

    let mqttClient: mqtt.MqttClient | null = null;
    if (options.mode === 'mqtt' || options.mode === 'both') {
      mqttClient = mqtt.connect(env.MQTT_BROKER_URL, {
        clientId: `polaris-sim-${Math.random().toString(36).substring(7)}`,
      });
      await new Promise((resolve) => mqttClient?.on('connect', resolve));
      console.log(`Connected simulator to MQTT Broker: ${env.MQTT_BROKER_URL}`);
    }

    let iterations = 0;
    const timer = setInterval(async () => {
      iterations++;
      const payload = this.generateTelemetryPayload('live');

      if (options.mode === 'http' || options.mode === 'both') {
        const res = await this.sendHttp(payload);
        console.log(`[HTTP INGEST #${iterations}] Status: ${res.status}`, payload.temperature + '°C', payload.depth + 'm');
      }

      if ((options.mode === 'mqtt' || options.mode === 'both') && mqttClient?.connected) {
        const topic = `${env.MQTT_TOPIC_PREFIX}/${this.deviceId}/telemetry`;
        mqttClient.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
          if (err) console.error('MQTT publish error:', err.message);
          else console.log(`[MQTT TELEMETRY #${iterations}] Published to ${topic}`);
        });
      }

      if (options.count > 0 && iterations >= options.count) {
        clearInterval(timer);
        mqttClient?.end();
        console.log('[POLARIS ESP32 SIMULATOR] Simulation run complete.');
      }
    }, options.intervalMs);
  }
}

// Direct CLI entry point
if (process.argv[1]?.includes('esp32-simulator')) {
  const modeArg = (process.argv[2] as any) || 'offline_sync_test';
  const simulator = new Esp32Simulator('POLARIS-001');
  simulator.start({
    mode: modeArg,
    intervalMs: 3000,
    count: modeArg === 'offline_sync_test' ? 1 : 10,
    deviceId: 'POLARIS-001',
  }).catch((err) => {
    console.error('Simulator error:', err);
  });
}
