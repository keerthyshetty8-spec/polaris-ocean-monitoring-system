import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller.js';

const router = Router();

router.get('/polaris/status', DeviceController.getStatus);
router.get('/device/battery', DeviceController.getBattery);
router.get('/device/battery/history', DeviceController.getBatteryHistory);
router.get('/device/communication', DeviceController.getCommunication);
router.get('/devices', DeviceController.listDevices);

export default router;
