import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { parseJsonlDataset } from '../shared/parseJsonl.js';
import type { EvalCase } from './eval.types.js';

const ExpectedSchema = z.object({
  type: z.enum(['income', 'expense']).nullable(),
  amountMajor: z.number().nullable(),
  currency: z.enum(['UAH', 'USD', 'EUR']).nullable(),
  categorySlug: z.string().nullable(),
  description: z.string().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

const CaseSchema = z.object({
  id: z.string().min(1),
  locale: z.enum(['en', 'uk']),
  message: z.string().min(1),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expected: ExpectedSchema,
  descriptionRubric: z.string().optional(),
  uncertaintyRubric: z.string().optional(),
});

/**
 * Parse a JSONL golden dataset (one case object per line; blank lines ignored).
 * Throws with the offending line number on the first malformed/invalid case, and
 * on a duplicate `id`, so a bad dataset fails loudly instead of grading silently.
 */
export function parseCases(text: string): EvalCase[] {
  return parseJsonlDataset(text, CaseSchema, 'cases.jsonl');
}

export function loadCases(path: string): EvalCase[] {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is the eval tool's fixed dataset location or an explicit CLI argument
  return parseCases(readFileSync(path, 'utf8'));
}
