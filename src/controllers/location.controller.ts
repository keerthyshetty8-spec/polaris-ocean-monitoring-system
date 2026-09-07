import { Request, Response } from 'express';
import { LocationService } from '../services/location.service.js';
import { sendSuccess } from '../utils/response.js';

export class LocationController {
  static async getCurrent(req: Request, res: Response) {
    const deviceId = (req.query.deviceId as string) || 'POLARIS-001';
    const location = await LocationService.getCurrentLocation(deviceId);
    return sendSuccess(res, location);
  }

  static async getHistory(req: Request, res: Response) {
    const { deviceId, missionId, limit } = req.query;
    const history = await LocationService.getLocationHistory({
      deviceId: deviceId as string,
      missionId: missionId as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    return sendSuccess(res, history);
  }
}
