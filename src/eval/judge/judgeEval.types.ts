import type { JudgeInput } from '../chat/eval.types.js';

/**
 * A hand-labeled meta-case for validating the LLM judge itself: a known judge
 * input paired with the verdict a correct judge should return for each criterion.
 * "Grading the grader" — so we trust the judge before trusting its grades.
 */
export interface JudgeMetaCase {
  id: string;
  input: JudgeInput;
  expect: {
    description: 'pass' | 'fail';
    uncertainty: 'pass' | 'fail';
  };
}
