import { Request, Response } from 'express';
import { DeviceService } from '../services/device.service.js';
import { SensorService } from '../services/sensor.service.js';
import { db } from '../config/database.js';
import { sendSuccess } from '../utils/response.js';

export class DeviceController {
  static async getStatus(req: Request, res: Response) {
    const deviceId = (req.query.deviceId as string) || 'POLARIS-001';
    const status = await DeviceService.getDeviceStatus(deviceId);
    return sendSuccess(res, status);
  }

  static async getBattery(req: Request, res: Response) {
    const deviceId = (req.query.deviceId as string) || 'POLARIS-001';
    const battery = await DeviceService.getBatteryStatus(deviceId);
    return sendSuccess(res, battery);
  }

  static async getBatteryHistory(req: Request, res: Response) {
    const { deviceId, limit, page } = req.query;
    const history = await SensorService.getMetricHistory('battery', {
      deviceId: (deviceId as string) || 'POLARIS-001',
      limit: limit ? parseInt(limit as string, 10) : undefined,
      page: page ? parseInt(page as string, 10) : undefined,
    });
    return sendSuccess(res, history);
  }

  static async getCommunication(req: Request, res: Response) {
    const deviceId = (req.query.deviceId as string) || 'POLARIS-001';
    const comm = await DeviceService.getCommunicationStatus(deviceId);
    return sendSuccess(res, comm);
  }

  static async listDevices(req: Request, res: Response) {
    const devices = await db.device.findMany();
    return sendSuccess(res, devices);
  }
}
