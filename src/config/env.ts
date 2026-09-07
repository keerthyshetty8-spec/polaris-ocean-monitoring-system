import dotenv from 'dotenv';
dotenv.config();

export interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: string;
  DATABASE_URL?: string;
  FRONTEND_URL: string;
  
  // MQTT Configuration
  MQTT_BROKER_URL: string;
  MQTT_USERNAME?: string;
  MQTT_PASSWORD?: string;
  MQTT_CLIENT_ID: string;
  MQTT_TOPIC_PREFIX: string;

  // Ingestion Security
  ESP32_API_KEY: string;

  // Thresholds (Configurable - awaiting final M1-M3 calibration specifications)
  LOW_BATTERY_THRESHOLD: number;
  TEMPERATURE_MIN: number;
  TEMPERATURE_MAX: number;
  DEPTH_MIN: number;
  DEPTH_MAX: number;
  SALINITY_MIN: number;
  SALINITY_MAX: number;

  // Device Timeout in seconds
  DEVICE_OFFLINE_TIMEOUT: number;

  // Data Mode
  DATA_SOURCE: 'hardware' | 'mock';
}

export const env: EnvironmentConfig = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  FRONTEND_URL: process.env.FRONTEND_URL || '*',

  MQTT_BROKER_URL: process.env.MQTT_BROKER_URL || 'mqtt://broker.emqx.io:1883',
  MQTT_USERNAME: process.env.MQTT_USERNAME || undefined,
  MQTT_PASSWORD: process.env.MQTT_PASSWORD || undefined,
  MQTT_CLIENT_ID: process.env.MQTT_CLIENT_ID || `polaris-backend-${Math.random().toString(36).substring(7)}`,
  MQTT_TOPIC_PREFIX: process.env.MQTT_TOPIC_PREFIX || 'polaris/device',

  ESP32_API_KEY: process.env.ESP32_API_KEY || 'polaris_esp32_dev_secret_key_2026',

  LOW_BATTERY_THRESHOLD: parseFloat(process.env.LOW_BATTERY_THRESHOLD || '20.0'),
  TEMPERATURE_MIN: parseFloat(process.env.TEMPERATURE_MIN || '2.0'),
  TEMPERATURE_MAX: parseFloat(process.env.TEMPERATURE_MAX || '35.0'),
  DEPTH_MIN: parseFloat(process.env.DEPTH_MIN || '0.0'),
  DEPTH_MAX: parseFloat(process.env.DEPTH_MAX || '100.0'),
  SALINITY_MIN: parseFloat(process.env.SALINITY_MIN || '30.0'),
  SALINITY_MAX: parseFloat(process.env.SALINITY_MAX || '40.0'),

  DEVICE_OFFLINE_TIMEOUT: parseInt(process.env.DEVICE_OFFLINE_TIMEOUT || '60', 10),
  DATA_SOURCE: (process.env.DATA_SOURCE === 'hardware' ? 'hardware' : 'mock') as 'hardware' | 'mock',
};
