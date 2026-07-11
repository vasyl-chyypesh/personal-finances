import type { Currency, LedgerEntryType } from '../../api/ledger/ledger.types.js';

/**
 * A hand-labeled expected extraction for one case. Mirrors the model's
 * {@link RawExtraction} shape minus `uncertainFields` (uncertainty is judged
 * separately by the LLM, not exact-matched). `null` means "the message does not
 * state this"; the normalizer then applies the same defaults the product uses.
 */
export interface ExpectedExtraction {
  type: LedgerEntryType | null;
  /** Amount in major units (e.g. 12.5), normalized to integer cents for grading. */
  amountMajor: number | null;
  currency: Currency | null;
  categorySlug: string | null;
  description: string | null;
  /** ISO date (YYYY-MM-DD) or `null`. */
  date: string | null;
}

/** One golden test case from `cases.jsonl`. */
export interface EvalCase {
  /** Stable, human-readable id (e.g. `en-grocery-basic`). */
  id: string;
  locale: 'en' | 'uk';
  message: string;
  /**
   * Fixed reference date the extractor resolves relative dates against, so
   * cases like "yesterday" grade deterministically regardless of run day.
   */
  today: string;
  expected: ExpectedExtraction;
  /** Free-text guidance for the LLM judge (phase 4). */
  descriptionRubric?: string;
  uncertaintyRubric?: string;
}

/** The objective fields graded deterministically by exact match. */
export type GradedField = 'type' | 'amount' | 'currency' | 'category' | 'date';

export interface FieldGrade {
  field: GradedField;
  pass: boolean;
  /** Display strings for the report (not used for comparison). */
  expected: string;
  actual: string;
}

export interface CaseResult {
  case: EvalCase;
  /** Empty when the extraction errored. */
  fields: FieldGrade[];
  /** True only when every field passed and no error occurred. */
  pass: boolean;
  /** Set when the extractor/normalizer threw (daemon down, unparseable reply). */
  error?: string;
}

export interface FieldTally {
  total: number;
  passed: number;
}

export interface RunReport {
  total: number;
  passed: number;
  /** 0..1. */
  passRate: number;
  byLocale: Record<string, FieldTally>;
  byField: Record<GradedField, FieldTally>;
  /** Cases that ran but failed at least one field. */
  failures: CaseResult[];
  /** Cases whose extraction threw. */
  errored: CaseResult[];
}
