import mqtt, { MqttClient } from 'mqtt';
import { env } from '../../config/env.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('MQTTClient');

let clientInstance: MqttClient | null = null;
let isConnected = false;

export function normalizeMqttBrokerUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return 'mqtt://localhost:1883';

  // If scheme is missing, determine based on port / host
  if (!url.includes('://')) {
    if (url.includes(':8883') || url.includes('hivemq.cloud') || url.includes('emqxsl') || url.includes('ssl') || url.includes('tls')) {
      return `mqtts://${url}`;
    }
    return `mqtt://${url}`;
  }

  // If user entered mqtt:// with a TLS port or secure host, convert to mqtts://
  if (url.startsWith('mqtt://') && (url.includes(':8883') || url.includes('hivemq.cloud') || url.includes('emqxsl'))) {
    return url.replace('mqtt://', 'mqtts://');
  }

  return url;
}

export function getMqttClient(): MqttClient | null {
  if (clientInstance) return clientInstance;

  try {
    const brokerUrl = normalizeMqttBrokerUrl(env.MQTT_BROKER_URL);
    logger.info(`Initializing MQTT connection to ${brokerUrl}`);

    const client = mqtt.connect(brokerUrl, {
      clientId: env.MQTT_CLIENT_ID,
      username: env.MQTT_USERNAME,
      password: env.MQTT_PASSWORD,
      reconnectPeriod: 8000,
      connectTimeout: 15000,
      clean: true,
      rejectUnauthorized: true,
    });

    let lastErrorLogTime = 0;

    client.on('connect', () => {
      isConnected = true;
      logger.info('Connected to MQTT broker successfully');
    });

    client.on('reconnect', () => {
      logger.info('Attempting to reconnect to MQTT broker...');
    });

    client.on('close', () => {
      isConnected = false;
      logger.warn('MQTT connection closed');
    });

    client.on('offline', () => {
      isConnected = false;
      logger.warn('MQTT broker client went offline');
    });

    client.on('error', (err) => {
      isConnected = false;
      const now = Date.now();
      // Throttle repeated connection errors to once every 30s to avoid spamming logs
      if (now - lastErrorLogTime > 30000) {
        lastErrorLogTime = now;
        logger.warn('MQTT connection error (will retry automatically)', { error: err.message });
      }
    });

    clientInstance = client;
    return client;
  } catch (err: any) {
    logger.error('Failed to initialize MQTT client', { error: err.message });
    return null;
  }
}

export function isMqttConnected(): boolean {
  return isConnected;
}
