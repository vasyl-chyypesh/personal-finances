import type { ChatExtractResult } from '../../api/chat/chat.types.js';
import type { FieldGrade } from './eval.types.js';

/** One side of a comparison: the normalized draft plus its raw category slug. */
export interface GradedExtraction {
  norm: ChatExtractResult;
  /** The category slug the model (or the label author) produced, or `null`. */
  slug: string | null;
}

function grade(field: FieldGrade['field'], expected: string, actual: string): FieldGrade {
  return { field, pass: expected === actual, expected, actual };
}

/**
 * Deterministically grade the objective fields by exact match. `type`, `amount`
 * (integer cents), `currency`, and `date` are compared on the normalized draft
 * (so a defaulted expected value only matches a defaulted actual one). `category`
 * is compared on the raw slug — the schema constrains the model to real slugs or
 * `null`, so slug equality is exactly category correctness — while displaying
 * `none` for an absent category.
 *
 * `description` and `uncertainFields` are intentionally excluded: they are judged
 * by the LLM grader, not exact-matched.
 */
export function gradeFields(expected: GradedExtraction, actual: GradedExtraction): FieldGrade[] {
  const e = expected.norm.draft;
  const a = actual.norm.draft;
  return [
    grade('type', e.type, a.type),
    grade('amount', String(e.amount), String(a.amount)),
    grade('currency', e.currency, a.currency),
    grade('category', expected.slug ?? 'none', actual.slug ?? 'none'),
    grade('date', e.date, a.date),
  ];
}
