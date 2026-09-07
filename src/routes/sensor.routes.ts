import { Router } from 'express';
import { SensorController } from '../controllers/sensor.controller.js';

const router = Router();

router.get('/sensors/latest', SensorController.getLatest);
router.get('/sensors/history', SensorController.getHistory);
router.get('/sensors/temperature/history', SensorController.getTemperatureHistory);
router.get('/sensors/depth/history', SensorController.getDepthHistory);
router.get('/sensors/salinity/history', SensorController.getSalinityHistory);
router.get('/sensors/conductivity/history', SensorController.getConductivityHistory);
router.get('/sensors/atmospheric/latest', SensorController.getAtmosphericLatest);
router.get('/depth/profile', SensorController.getDepthProfile);

export default router;
