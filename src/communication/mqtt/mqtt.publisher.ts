import { getMqttClient } from './mqtt.client.js';
import { env } from '../../config/env.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('MQTTPublisher');

export class MqttPublisher {
  static async publish(topic: string, message: any, qos: 0 | 1 | 2 = 1): Promise<boolean> {
    const client = getMqttClient();
    if (!client || !client.connected) {
      logger.warn('Cannot publish message: MQTT client not connected');
      return false;
    }

    return new Promise((resolve) => {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      client.publish(topic, payload, { qos }, (err) => {
        if (err) {
          logger.error('Failed to publish MQTT message', { topic, error: err.message });
          resolve(false);
        } else {
          logger.debug('MQTT message published successfully', { topic });
          resolve(true);
        }
      });
    });
  }

  static async sendDeviceCommand(deviceId: string, command: Record<string, any>) {
    const topic = `${env.MQTT_TOPIC_PREFIX}/${deviceId}/commands`;
    return this.publish(topic, command);
  }
}
