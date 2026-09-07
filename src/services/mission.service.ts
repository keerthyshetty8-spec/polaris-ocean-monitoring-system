import { db } from '../config/database.js';

export class MissionService {
  static async listMissions(deviceId?: string) {
    const where: any = {};
    if (deviceId) where.deviceId = deviceId;
    return await db.mission.findMany({ where });
  }

  static async getMissionDetails(missionIdentifier: string) {
    const mission = await db.mission.findUnique({
      where: { missionId: missionIdentifier },
    });

    if (!mission) return null;

    // Calculate actual sensor summaries for this mission
    const readings = await db.sensorReading.findMany({
      where: { missionId: mission.missionId },
      orderBy: { timestamp: 'asc' },
    });

    const locations = await db.location.findMany({
      where: { missionId: mission.missionId },
      orderBy: { timestamp: 'asc' },
    });

    const temps = readings.map((r) => r.temperature).filter((v): v is number => v !== null && v !== undefined);
    const depths = readings.map((r) => r.depth).filter((v): v is number => v !== null && v !== undefined);
    const salinities = readings.map((r) => r.salinity).filter((v): v is number => v !== null && v !== undefined);

    const sensorSummary = {
      totalReadings: readings.length,
      temperature: temps.length > 0 ? {
        min: Math.min(...temps),
        max: Math.max(...temps),
        avg: parseFloat((temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2)),
      } : null,
      depth: depths.length > 0 ? {
        min: Math.min(...depths),
        max: Math.max(...depths),
        avg: parseFloat((depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(2)),
      } : null,
      salinity: salinities.length > 0 ? {
        min: Math.min(...salinities),
        max: Math.max(...salinities),
        avg: parseFloat((salinities.reduce((a, b) => a + b, 0) / salinities.length).toFixed(2)),
      } : null,
    };

    const locationSummary = {
      totalPoints: locations.length,
      startPoint: locations.length > 0 ? { lat: locations[0].latitude, lon: locations[0].longitude } : null,
      endPoint: locations.length > 0 ? { lat: locations[locations.length - 1].latitude, lon: locations[locations.length - 1].longitude } : null,
    };

    return {
      ...mission,
      sensorSummary,
      locationSummary,
    };
  }

  static async createMission(data: {
    missionId: string;
    deviceId: string;
    name: string;
    description?: string;
    startTime?: string | Date;
  }) {
    return await db.mission.create({
      data: {
        missionId: data.missionId,
        deviceId: data.deviceId,
        name: data.name,
        description: data.description || null,
        startTime: data.startTime ? new Date(data.startTime) : new Date(),
        status: 'active',
      },
    });
  }

  static async updateMission(
    missionIdentifier: string,
    data: {
      name?: string;
      description?: string;
      status?: 'active' | 'completed' | 'aborted';
      endTime?: string | Date;
    }
  ) {
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.endTime) updateData.endTime = new Date(data.endTime);

    return await db.mission.update({
      where: { missionId: missionIdentifier },
      data: updateData,
    });
  }
}
