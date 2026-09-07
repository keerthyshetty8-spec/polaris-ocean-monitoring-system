import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller.js';

const router = Router();

router.get('/alerts', AlertController.getActive);
router.get('/alerts/history', AlertController.getHistory);
router.patch('/alerts/:id/resolve', AlertController.resolve);

export default router;
