import { db } from '../config/database.js';
import { env } from '../config/env.js';

export class DeviceService {
  /**
   * Computes device status dynamically based on actual lastSeen timestamp vs timeout.
   */
  static async getDeviceStatus(deviceId: string = 'POLARIS-001') {
    const device = await db.device.findUnique({
      where: { deviceId },
    });

    const [latestReading, latestLocation, latestComm] = await Promise.all([
      db.sensorReading.findFirst({
        where: { deviceId },
        orderBy: { timestamp: 'desc' },
      }),
      db.location.findFirst({
        where: { deviceId },
        orderBy: { timestamp: 'desc' },
      }),
      db.communicationStatus.findFirst({
        where: { deviceId },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    if (!device && !latestReading) {
      return {
        deviceId,
        status: 'offline',
        isOnline: false,
        message: 'Device not yet registered or has not transmitted telemetry',
      };
    }

    const lastSeenTime = latestReading?.timestamp
      ? new Date(latestReading.timestamp).getTime()
      : device?.lastSeen
      ? new Date(device.lastSeen).getTime()
      : 0;

    const elapsedSeconds = Math.floor((Date.now() - lastSeenTime) / 1000);
    const isOnline = lastSeenTime > 0 && elapsedSeconds <= env.DEVICE_OFFLINE_TIMEOUT;

    return {
      deviceId: device?.deviceId || deviceId,
      name: device?.name || `POLARIS Unit (${deviceId})`,
      status: isOnline ? 'online' : 'offline',
      isOnline,
      lastSeen: lastSeenTime > 0 ? new Date(lastSeenTime).toISOString() : null,
      secondsSinceLastSeen: elapsedSeconds,
      timeoutThresholdSeconds: env.DEVICE_OFFLINE_TIMEOUT,
      battery: {
        level: latestReading?.battery ?? null,
        voltage: latestReading?.batteryVoltage ?? null,
        status: latestReading?.battery !== null && latestReading?.battery !== undefined
          ? latestReading.battery <= env.LOW_BATTERY_THRESHOLD
            ? 'low'
            : 'normal'
          : 'unknown',
      },
      communication: {
        protocol: latestComm?.protocol || (latestReading?.ingestionMethod?.toUpperCase() ?? 'NONE'),
        status: isOnline ? (latestComm?.status || 'connected') : 'disconnected',
        lastCommTimestamp: latestComm?.timestamp || latestReading?.timestamp || null,
      },
      currentLocation: latestLocation
        ? {
            latitude: latestLocation.latitude,
            longitude: latestLocation.longitude,
            altitude: latestLocation.altitude,
            speed: latestLocation.speed,
            timestamp: latestLocation.timestamp,
          }
        : null,
      lastUpdated: new Date().toISOString(),
    };
  }

  static async getBatteryStatus(deviceId: string = 'POLARIS-001') {
    const latest = await db.sensorReading.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });

    return {
      deviceId,
      level: latest?.battery ?? null,
      voltage: latest?.batteryVoltage ?? null,
      isLow: latest?.battery !== null && latest?.battery !== undefined ? latest.battery <= env.LOW_BATTERY_THRESHOLD : false,
      threshold: env.LOW_BATTERY_THRESHOLD,
      lastUpdated: latest?.timestamp || null,
    };
  }

  static async getCommunicationStatus(deviceId: string = 'POLARIS-001') {
    const latestComm = await db.communicationStatus.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });

    const status = await this.getDeviceStatus(deviceId);

    return {
      deviceId,
      protocol: latestComm?.protocol || 'HTTP',
      status: status.isOnline ? 'connected' : 'disconnected',
      isOnline: status.isOnline,
      lastSeen: status.lastSeen,
      details: latestComm?.details ? JSON.parse(latestComm.details) : null,
    };
  }
}
