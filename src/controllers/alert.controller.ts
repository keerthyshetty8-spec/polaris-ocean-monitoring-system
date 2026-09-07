import { Request, Response } from 'express';
import { AlertService } from '../services/alert.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class AlertController {
  static async getActive(req: Request, res: Response) {
    const { deviceId, type, severity, limit } = req.query;
    const alerts = await AlertService.getActiveAlerts({
      deviceId: deviceId as string,
      type: type as string,
      severity: severity as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    return sendSuccess(res, alerts);
  }

  static async getHistory(req: Request, res: Response) {
    const { deviceId, type, severity, resolved, limit } = req.query;
    const alerts = await AlertService.getAlertsHistory({
      deviceId: deviceId as string,
      type: type as string,
      severity: severity as string,
      resolved: resolved !== undefined ? resolved === 'true' : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    return sendSuccess(res, alerts);
  }

  static async resolve(req: Request, res: Response) {
    const { id } = req.params;
    const { note } = req.body || {};

    try {
      const resolved = await AlertService.resolveAlert(id, note);
      return sendSuccess(res, resolved);
    } catch (err: any) {
      return sendError(res, 'ALERT_NOT_FOUND', err.message || 'Alert not found', 404);
    }
  }
}
