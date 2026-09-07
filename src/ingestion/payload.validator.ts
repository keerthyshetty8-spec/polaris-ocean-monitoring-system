import { ZodError } from 'zod';
import { Esp32SensorPayloadSchema, Esp32BatchIngestSchema, Esp32SensorPayload, Esp32BatchIngestPayload } from '../schemas/sensor.schema.js';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

export class PayloadValidator {
  static validateSinglePayload(raw: any): ValidationResult<Esp32SensorPayload> {
    try {
      const parsed = Esp32SensorPayloadSchema.parse(raw);
      return { success: true, data: parsed };
    } catch (err) {
      if (err instanceof ZodError || (err && typeof err === 'object' && ('issues' in err || 'errors' in err))) {
        const issues = (err as any).issues || (err as any).errors || [];
        const errors = issues.map((e: any) => `${(e.path || []).join('.')}: ${e.message}`);
        return { success: false, errors: errors.length > 0 ? errors : [String(err)] };
      }
      return { success: false, errors: ['Unknown payload validation failure'] };
    }
  }

  static validateBatchPayload(raw: any): ValidationResult<Esp32BatchIngestPayload> {
    try {
      const parsed = Esp32BatchIngestSchema.parse(raw);
      return { success: true, data: parsed };
    } catch (err) {
      if (err instanceof ZodError || (err && typeof err === 'object' && ('issues' in err || 'errors' in err))) {
        const issues = (err as any).issues || (err as any).errors || [];
        const errors = issues.map((e: any) => `${(e.path || []).join('.')}: ${e.message}`);
        return { success: false, errors: errors.length > 0 ? errors : [String(err)] };
      }
      return { success: false, errors: ['Unknown batch validation failure'] };
    }
  }
}
