import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { parseJsonlDataset } from '../shared/parseJsonl.js';
import type { JudgeMetaCase } from './judgeEval.types.js';

const InputSchema = z.object({
  message: z.string().min(1),
  expectedDescription: z.string().nullable(),
  actualDescription: z.string().nullable(),
  descriptionRubric: z.string().optional(),
  flaggedByModel: z.array(z.enum(['type', 'amount', 'currency', 'category', 'date'])),
  uncertaintyRubric: z.string().optional(),
});

const MetaCaseSchema = z.object({
  id: z.string().min(1),
  input: InputSchema,
  expect: z.object({
    description: z.enum(['pass', 'fail']),
    uncertainty: z.enum(['pass', 'fail']),
  }),
});

/** Parse the judge meta-eval dataset (JSONL). Same failure discipline as the chat loader. */
export function parseJudgeCases(text: string): JudgeMetaCase[] {
  return parseJsonlDataset(text, MetaCaseSchema, 'judgeCases.jsonl');
}

export function loadJudgeCases(path: string): JudgeMetaCase[] {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is the tool's fixed dataset location or an explicit CLI argument
  return parseJudgeCases(readFileSync(path, 'utf8'));
}
