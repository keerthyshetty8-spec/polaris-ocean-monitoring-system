import { db } from '../config/database.js';

export interface HistoryFilterParams {
  deviceId?: string;
  missionId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

export class SensorService {
  static async getLatestReading(deviceId: string = 'POLARIS-001') {
    return await db.sensorReading.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });
  }

  static async getReadingsHistory(params: HistoryFilterParams) {
    const page = params.page || 1;
    const limit = params.limit || 100;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.deviceId) where.deviceId = params.deviceId;
    if (params.missionId) where.missionId = params.missionId;
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = new Date(params.startDate);
      if (params.endDate) where.timestamp.lte = new Date(params.endDate);
    }

    const [readings, total] = await Promise.all([
      db.sensorReading.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip,
      }),
      db.sensorReading.count({ where }),
    ]);

    return {
      readings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getMetricHistory(
    metric: 'temperature' | 'depth' | 'salinity' | 'conductivity' | 'battery',
    params: HistoryFilterParams
  ) {
    const history = await this.getReadingsHistory(params);
    const dataPoints = history.readings
      .filter((r) => r[metric] !== null && r[metric] !== undefined)
      .map((r) => ({
        timestamp: r.timestamp,
        value: r[metric],
        deviceId: r.deviceId,
        source: r.source,
      }));

    return {
      metric,
      unit: metric === 'temperature' ? '°C' : metric === 'depth' ? 'm' : metric === 'salinity' ? 'PSU' : metric === 'conductivity' ? 'mS/cm' : '%',
      count: dataPoints.length,
      data: dataPoints,
      pagination: history.pagination,
    };
  }

  static async getAtmosphericLatest(deviceId: string = 'POLARIS-001') {
    const latest = await db.sensorReading.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });

    if (!latest) return null;

    return {
      deviceId: latest.deviceId,
      timestamp: latest.timestamp,
      temperature: latest.atmosphericTemp,
      pressure: latest.atmosphericPressure,
      humidity: latest.atmosphericHumidity,
    };
  }

  static async getDepthProfile(deviceId: string = 'POLARIS-001') {
    const latest = await db.sensorReading.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });

    if (!latest || latest.depth === null) {
      return {
        deviceId,
        available: false,
        message: 'No depth readings available yet for this device',
      };
    }

    // Retrieve recent depth progression (last 30 readings with depth)
    const recentReadings = await db.sensorReading.findMany({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
      take: 30,
    });

    const strata = recentReadings
      .filter((r) => r.depth !== null)
      .map((r) => ({
        depthMeters: r.depth,
        temperature: r.temperature,
        salinity: r.salinity,
        pressure: r.pressure,
        timestamp: r.timestamp,
      }));

    return {
      deviceId,
      available: true,
      currentDepth: latest.depth,
      currentTemperature: latest.temperature,
      currentPressure: latest.pressure,
      currentSalinity: latest.salinity,
      timestamp: latest.timestamp,
      depthStrata: strata,
    };
  }
}
