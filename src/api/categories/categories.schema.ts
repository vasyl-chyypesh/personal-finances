import { z } from 'zod';

export const UpdateNamesSchema = z.object({
  names: z
    .object({
      en: z.string().trim().min(1).optional(),
      uk: z.string().trim().min(1).optional(),
    })
    .refine((names) => names.en !== undefined || names.uk !== undefined, {
      message: 'At least one locale name required',
    }),
});

export const IdParamSchema = z.object({
  id: z.string().regex(/^\d+$/).transform(Number),
});
