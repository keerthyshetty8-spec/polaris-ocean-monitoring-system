import { z } from 'zod';

export const DeviceStatusQuerySchema = z.object({
  deviceId: z.string().default('POLARIS-001').optional(),
});

export const RegisterDeviceSchema = z.object({
  deviceId: z.string().min(1),
  name: z.string().min(1),
});
