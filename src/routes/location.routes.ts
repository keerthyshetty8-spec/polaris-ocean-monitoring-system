import { Router } from 'express';
import { LocationController } from '../controllers/location.controller.js';

const router = Router();

router.get('/location/current', LocationController.getCurrent);
router.get('/location/history', LocationController.getHistory);

export default router;
