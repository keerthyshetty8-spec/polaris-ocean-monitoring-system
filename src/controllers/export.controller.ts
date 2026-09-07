import { Request, Response } from 'express';
import { ExportService } from '../services/export.service.js';

export class ExportController {
  static async exportSensorsCsv(req: Request, res: Response) {
    const { deviceId, missionId, startDate, endDate } = req.query;

    const csvData = await ExportService.exportSensorsCsv({
      deviceId: deviceId as string,
      missionId: missionId as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    const filename = `polaris_sensor_data_${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvData);
  }
}
