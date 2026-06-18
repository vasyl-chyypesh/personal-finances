import { z } from 'zod';

export const ExtractSchema = z.object({
  // A single natural-language sentence describing one transaction.
  message: z.string().trim().min(1).max(500),
});
