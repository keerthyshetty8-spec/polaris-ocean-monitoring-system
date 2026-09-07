import { z } from 'zod';

export const AlertQuerySchema = z.object({
  deviceId: z.string().optional(),
  type: z.string().optional(),
  severity: z.enum(['critical', 'warning', 'info']).optional(),
  resolved: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  limit: z.coerce.number().min(1).max(200).default(50).optional(),
});

export const ResolveAlertSchema = z.object({
  resolvedNote: z.string().optional(),
});
