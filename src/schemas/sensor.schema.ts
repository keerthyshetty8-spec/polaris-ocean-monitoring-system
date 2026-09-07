import { z } from 'zod';

export const AtmosphericDataSchema = z.object({
  temperature: z.number().min(-40).max(85).optional(),
  pressure: z.number().min(300).max(1200).optional(),
  humidity: z.number().min(0).max(100).optional(),
}).optional();

export const GnssDataSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  speed: z.number().min(0).optional(),
}).optional();

/**
 * Provisional ESP32 Sensor Ingestion Schema
 * (Easily customizable once M2 delivers final hardware payload specification)
 */
export const Esp32SensorPayloadSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  timestamp: z.string().or(z.date()).refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Invalid ISO timestamp',
  }),
  temperature: z.number().min(-5).max(50).optional().nullable(),
  pressure: z.number().min(0).max(1000).optional().nullable(),
  depth: z.number().min(0).max(5000).optional().nullable(),
  conductivity: z.number().min(0).max(100).optional().nullable(),
  salinity: z.number().min(0).max(60).optional().nullable(),
  atmospheric: AtmosphericDataSchema,
  gnss: GnssDataSchema,
  battery: z.number().min(0).max(100).optional().nullable(),
  batteryVoltage: z.number().min(0).max(30).optional().nullable(),
  
  // Provenance & Offline Sync support
  source: z.enum(['live', 'buffered_sd', 'simulator']).default('live').optional(),
  eventId: z.string().optional(),
  missionId: z.string().optional(),
});

export const Esp32BatchIngestSchema = z.object({
  batchId: z.string().optional(),
  deviceId: z.string().optional(),
  records: z.array(Esp32SensorPayloadSchema).min(1, 'At least one record is required'),
});

export const SensorHistoryQuerySchema = z.object({
  deviceId: z.string().optional(),
  missionId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100).optional(),
  page: z.coerce.number().min(1).default(1).optional(),
});

export type Esp32SensorPayload = z.infer<typeof Esp32SensorPayloadSchema>;
export type Esp32BatchIngestPayload = z.infer<typeof Esp32BatchIngestSchema>;
