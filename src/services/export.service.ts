import { db } from '../config/database.js';

export interface CsvExportFilterParams {
  deviceId?: string;
  missionId?: string;
  startDate?: string;
  endDate?: string;
}

export class ExportService {
  /**
   * Generates standard RFC 4180 CSV string from real database sensor readings.
   */
  static async exportSensorsCsv(params: CsvExportFilterParams): Promise<string> {
    const where: any = {};
    if (params.deviceId) where.deviceId = params.deviceId;
    if (params.missionId) where.missionId = params.missionId;
    if (params.startDate || params.endDate) {
      where.timestamp = {};
      if (params.startDate) where.timestamp.gte = new Date(params.startDate);
      if (params.endDate) where.timestamp.lte = new Date(params.endDate);
    }

    const readings = await db.sensorReading.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    const headers = [
      'id',
      'deviceId',
      'timestamp',
      'temperature_c',
      'pressure_bar',
      'depth_m',
      'conductivity_ms_cm',
      'salinity_psu',
      'atmospheric_temp_c',
      'atmospheric_pressure_hpa',
      'atmospheric_humidity_pct',
      'battery_pct',
      'battery_v',
      'source',
      'ingestionMethod',
      'missionId',
      'fingerprint',
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = readings.map((r) => [
      r.id,
      r.deviceId,
      new Date(r.timestamp).toISOString(),
      r.temperature ?? '',
      r.pressure ?? '',
      r.depth ?? '',
      r.conductivity ?? '',
      r.salinity ?? '',
      r.atmosphericTemp ?? '',
      r.atmosphericPressure ?? '',
      r.atmosphericHumidity ?? '',
      r.battery ?? '',
      r.batteryVoltage ?? '',
      r.source,
      r.ingestionMethod,
      r.missionId ?? '',
      r.fingerprint,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\r\n');

    return csvContent;
  }
}
