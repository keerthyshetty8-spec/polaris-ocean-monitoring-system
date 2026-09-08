import { getMqttClient } from './mqtt.client.js';
import { env } from '../../config/env.js';
import { IngestionService } from '../../ingestion/ingestion.service.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('MQTTSubscriber');

export function startMqttSubscriber() {
  const client = getMqttClient();
  if (!client) {
    logger.warn('MQTT client unavailable. Telemetry subscriber not started.');
    return;
  }

  // Provisional topic patterns (configurable via MQTT_TOPIC_PREFIX)
  // Pattern: polaris/device/+/telemetry and polaris/device/+/batch
  const telemetryTopic = `${env.MQTT_TOPIC_PREFIX}/+/telemetry`;
  const batchTopic = `${env.MQTT_TOPIC_PREFIX}/+/batch`;

  const doSubscribe = () => {
    client.subscribe([telemetryTopic, batchTopic], { qos: 1 }, (err, granted) => {
      if (err) {
        logger.error('Failed to subscribe to MQTT topics', { error: err.message });
      } else {
        logger.info('Subscribed to MQTT topics successfully', {
          granted: granted?.map((g) => `${g.topic} (QoS ${g.qos})`),
        });
      }
    });
  };

  if (client.connected) {
    doSubscribe();
  }
  client.on('connect', doSubscribe);

  client.on('message', async (topic: string, messageBuffer: Buffer) => {
    const rawString = messageBuffer.toString();
    logger.debug(`MQTT message received on ${topic}`);

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(rawString);
    } catch (parseErr: any) {
      logger.warn('Received malformed JSON on MQTT topic', {
        topic,
        error: parseErr.message,
        payloadPreview: rawString.substring(0, 100),
      });
      return;
    }

    try {
      if (topic.endsWith('/batch') || Array.isArray(parsedPayload) || parsedPayload.records) {
        // Batch ingestion (e.g. offline synchronization replay)
        await IngestionService.ingestBatch(parsedPayload, 'mqtt');
      } else {
        // Single live reading
        await IngestionService.ingestSingle(parsedPayload, 'mqtt');
      }
    } catch (ingestErr: any) {
      logger.error('Error processing MQTT payload', { error: ingestErr.message, topic });
    }
  });
}
