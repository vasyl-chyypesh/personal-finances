import { z } from 'zod';

export { IdParamSchema } from '../shared/validation.js';

export const CreateSchema = z.object({
  type: z.enum(['income', 'expense']),
  // Integer minor units (cents); IEEE-754 floats can't represent money exactly.
  amount: z.number().int().positive(),
  currency: z.enum(['UAH', 'USD', 'EUR']),
  categoryId: z.number().int().positive(),
  description: z.string().optional(),
  // Real calendar date (rejects 2026-02-30, 2026-13-01, etc.), not just the shape.
  date: z.iso.date(),
});

export const UpdateSchema = CreateSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field required',
});

export const ListQuerySchema = z
  .object({
    period: z.enum(['week', 'month', 'year']).default('month'),
    year: z.coerce.number().int().min(1970).max(9999).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    limit: z.coerce.number().int().positive().max(500).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  // `offset` without `limit` would be silently ignored by the repository, so
  // reject it rather than returning the full unpaged range.
  .refine((q) => q.offset === undefined || q.limit !== undefined, {
    message: 'limit is required when offset is provided',
    path: ['limit'],
  });
