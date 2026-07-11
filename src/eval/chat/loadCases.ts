import { readFileSync } from 'node:fs';
import { z } from 'zod';
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
  const cases: EvalCase[] = [];
  const seen = new Set<string>();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // eslint-disable-next-line security/detect-object-injection -- i is a bounded loop index into lines
    const line = lines[i].trim();
    if (line === '') continue;

    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      throw new Error(`cases.jsonl line ${i + 1}: not valid JSON`);
    }

    const result = CaseSchema.safeParse(json);
    if (!result.success) {
      throw new Error(`cases.jsonl line ${i + 1}: ${result.error.issues[0]?.message ?? 'invalid'}`);
    }
    if (seen.has(result.data.id)) {
      throw new Error(`cases.jsonl line ${i + 1}: duplicate case id "${result.data.id}"`);
    }
    seen.add(result.data.id);
    cases.push(result.data);
  }

  return cases;
}

export function loadCases(path: string): EvalCase[] {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is the eval tool's fixed dataset location or an explicit CLI argument
  return parseCases(readFileSync(path, 'utf8'));
}
