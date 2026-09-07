import { z } from 'zod';

export const CreateMissionSchema = z.object({
  missionId: z.string().min(1),
  deviceId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().or(z.date()).optional(),
});

export const UpdateMissionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'aborted']).optional(),
  endTime: z.string().or(z.date()).optional(),
});
