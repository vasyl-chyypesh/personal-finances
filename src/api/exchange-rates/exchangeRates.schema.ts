import { z } from 'zod';

/**
 * Query for `GET /api/exchange-rates/history`. Both bounds are optional; the
 * service defaults `to` to today and `from` to the start of the allowed window,
 * and clamps the effective range. Ordering is enforced when both are supplied.
 */
export const HistoryQuerySchema = z
  .object({
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine((q) => q.from === undefined || q.to === undefined || q.from <= q.to, {
    message: 'from must be on or before to',
    path: ['from'],
  });

export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
