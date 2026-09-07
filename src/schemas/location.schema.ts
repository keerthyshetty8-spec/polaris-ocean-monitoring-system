import { z } from 'zod';

export const LocationHistoryQuerySchema = z.object({
  deviceId: z.string().optional(),
  missionId: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(100).optional(),
});
