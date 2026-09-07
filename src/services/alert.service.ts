import { db } from '../config/database.js';

export interface AlertFilterParams {
  deviceId?: string;
  type?: string;
  severity?: string;
  resolved?: boolean;
  limit?: number;
}

export class AlertService {
  static async getActiveAlerts(params: AlertFilterParams) {
    const where: any = { resolved: false };
    if (params.deviceId) where.deviceId = params.deviceId;
    if (params.type) where.type = params.type;
    if (params.severity) where.severity = params.severity;

    return await db.alert.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params.limit || 50,
    });
  }

  static async getAlertsHistory(params: AlertFilterParams) {
    const where: any = {};
    if (params.deviceId) where.deviceId = params.deviceId;
    if (params.type) where.type = params.type;
    if (params.severity) where.severity = params.severity;
    if (params.resolved !== undefined) where.resolved = params.resolved;

    return await db.alert.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: params.limit || 100,
    });
  }

  static async resolveAlert(id: string, note?: string) {
    const updated = await db.alert.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        metadata: note ? JSON.stringify({ resolutionNote: note }) : undefined,
      },
    });

    return updated;
  }
}
