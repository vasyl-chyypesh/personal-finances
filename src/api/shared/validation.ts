import { z } from 'zod';

/**
 * Shared `:id` path-param schema. Accepts a positive integer string, coerces it
 * to a number, and rejects values beyond the safe-integer range (which would
 * otherwise round silently and surface as a misleading 404).
 */
export const IdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine(Number.isSafeInteger, 'Invalid id'),
});
