import { Request, Response } from 'express';
import { SensorService } from '../services/sensor.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class SensorController {
  static async getLatest(req: Request, res: Response) {
    const deviceId = (req.query.deviceId as string) || 'POLARIS-001';
    const reading = await SensorService.getLatestReading(deviceId);
    if (!reading) {
      return sendSuccess(res, null);
    }
    return sendSuccess(res, reading);
  }

  static async getHistory(req: Request, res: Response) {
    const { deviceId, missionId, startDate, endDate, limit, page } = req.query;
    const history = await SensorService.getReadingsHistory({
      deviceId: deviceId as string,
      missionId: missionId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
    });
    return sendSuccess(res, history);
  }

  static async getTemperatureHistory(req: Request, res: Response) {
    const { deviceId, missionId, startDate, endDate, limit, page } = req.query;
    const history = await SensorService.getMetricHistory('temperature', {
      deviceId: deviceId as string,
      missionId: missionId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
    });
    return sendSuccess(res, history);
  }

  static async getDepthHistory(req: Request, res: Response) {
    const { deviceId, missionId, startDate, endDate, limit, page } = req.query;
    const history = await SensorService.getMetricHistory('depth', {
      deviceId: deviceId as string,
      missionId: missionId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
    });
    return sendSuccess(res, history);
  }

  static async getSalinityHistory(req: Request, res: Response) {
    const { deviceId, missionId, startDate, endDate, limit, page } = req.query;
    const history = await SensorService.getMetricHistory('salinity', {
      deviceId: deviceId as string,
      missionId: missionId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
    });
    return sendSuccess(res, history);
  }

  static async getConductivityHistory(req: Request, res: Response) {
    const { deviceId, missionId, startDate, endDate, limit, page } = req.query;
    const history = await SensorService.getMetricHistory('conductivity', {
      deviceId: deviceId as string,
      missionId: missionId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
    });
    return sendSuccess(res, history);
  }

  static async getAtmosphericLatest(req: Request, res: Response) {
    const deviceId = (req.query.deviceId as string) || 'POLARIS-001';
    const atmospheric = await SensorService.getAtmosphericLatest(deviceId);
    return sendSuccess(res, atmospheric);
  }

  static async getDepthProfile(req: Request, res: Response) {
    const deviceId = (req.query.deviceId as string) || 'POLARIS-001';
    const profile = await SensorService.getDepthProfile(deviceId);
    return sendSuccess(res, profile);
  }
}
