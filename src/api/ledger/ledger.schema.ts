import { z } from 'zod';

export const CreateSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  currency: z.enum(['UAH', 'USD', 'EUR']),
  categoryId: z.number().int().positive(),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const UpdateSchema = CreateSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field required',
});

export const ListQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year']).default('month'),
  year: z.coerce.number().int().min(1970).max(9999).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});
