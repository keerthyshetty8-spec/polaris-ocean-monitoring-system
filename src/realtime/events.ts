import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('RealtimeEvents');

export type PolarisEventName =
  | 'sensor:update'
  | 'device:update'
  | 'location:update'
  | 'alert:new'
  | 'communication:update';

class RealtimeEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  broadcast(event: PolarisEventName, data: any) {
    logger.debug(`Broadcasting event: ${event}`, { event, deviceId: data?.deviceId });
    this.emit(event, data);
    this.emit('all', { event, data });
  }
}

export const realtimeEmitter = new RealtimeEventEmitter();
