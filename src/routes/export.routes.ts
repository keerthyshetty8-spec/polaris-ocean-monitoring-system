import { Router } from 'express';
import { ExportController } from '../controllers/export.controller.js';

const router = Router();

router.get('/export/sensors.csv', ExportController.exportSensorsCsv);

export default router;
