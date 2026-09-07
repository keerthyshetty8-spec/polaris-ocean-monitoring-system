import { Request, Response } from 'express';
import { MissionService } from '../services/mission.service.js';
import { sendSuccess, sendError } from '../utils/response.js';

export class MissionController {
  static async list(req: Request, res: Response) {
    const deviceId = req.query.deviceId as string | undefined;
    const missions = await MissionService.listMissions(deviceId);
    return sendSuccess(res, missions);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const mission = await MissionService.getMissionDetails(id);
    if (!mission) {
      return sendError(res, 'MISSION_NOT_FOUND', `Mission with ID ${id} was not found`, 404);
    }
    return sendSuccess(res, mission);
  }

  static async create(req: Request, res: Response) {
    const { missionId, deviceId, name, description, startTime } = req.body;
    if (!missionId || !deviceId || !name) {
      return sendError(res, 'INVALID_PAYLOAD', 'missionId, deviceId, and name are required', 400);
    }

    try {
      const created = await MissionService.createMission({
        missionId,
        deviceId,
        name,
        description,
        startTime,
      });
      return sendSuccess(res, created, 201);
    } catch (err: any) {
      return sendError(res, 'MISSION_CREATION_FAILED', err.message || 'Could not create mission', 400);
    }
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const updated = await MissionService.updateMission(id, req.body);
      return sendSuccess(res, updated);
    } catch (err: any) {
      return sendError(res, 'MISSION_UPDATE_FAILED', err.message || 'Could not update mission', 400);
    }
  }
}
