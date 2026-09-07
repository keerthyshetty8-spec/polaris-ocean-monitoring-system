import { Router } from 'express';
import { MissionController } from '../controllers/mission.controller.js';

const router = Router();

router.get('/missions', MissionController.list);
router.get('/missions/:id', MissionController.getById);
router.post('/missions', MissionController.create);
router.patch('/missions/:id', MissionController.update);

export default router;
