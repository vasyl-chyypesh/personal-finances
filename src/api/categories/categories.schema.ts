import { z } from 'zod';

export { IdParamSchema } from '../shared/validation.js';

const NamesSchema = z
  .object({
    en: z.string().trim().min(1).optional(),
    uk: z.string().trim().min(1).optional(),
  })
  .refine((names) => names.en !== undefined || names.uk !== undefined, {
    message: 'At least one locale name required',
  });

export const CreateCategorySchema = z.object({
  names: NamesSchema,
});

export const UpdateNamesSchema = z.object({
  names: NamesSchema,
});

export const ReorderSchema = z.object({
  ids: z.array(z.number().int().positive()).nonempty(),
});

export const ListQuerySchema = z.object({
  includeDeleted: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});
