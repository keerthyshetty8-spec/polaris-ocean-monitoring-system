import { db } from '../config/database.js';

export class LocationService {
  static async getCurrentLocation(deviceId: string = 'POLARIS-001') {
    const loc = await db.location.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });

    if (!loc) {
      return {
        deviceId,
        available: false,
        location: null,
        message: 'No GNSS fix acquired yet for this device',
      };
    }

    return {
      deviceId,
      available: true,
      location: {
        latitude: loc.latitude,
        longitude: loc.longitude,
        altitude: loc.altitude,
        speed: loc.speed,
        timestamp: loc.timestamp,
      },
    };
  }

  static async getLocationHistory(params: { deviceId?: string; missionId?: string; limit?: number }) {
    const deviceId = params.deviceId || 'POLARIS-001';
    const limit = params.limit || 100;

    const where: any = { deviceId };
    if (params.missionId) where.missionId = params.missionId;

    const locations = await db.location.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return {
      deviceId,
      count: locations.length,
      coordinates: locations.map((l) => ({
        latitude: l.latitude,
        longitude: l.longitude,
        altitude: l.altitude,
        speed: l.speed,
        timestamp: l.timestamp,
      })),
    };
  }
}
