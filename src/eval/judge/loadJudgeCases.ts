import { readFileSync } from 'node:fs';
import { z } from 'zod';
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
  const cases: JudgeMetaCase[] = [];
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
      throw new Error(`judgeCases.jsonl line ${i + 1}: not valid JSON`);
    }

    const result = MetaCaseSchema.safeParse(json);
    if (!result.success) {
      throw new Error(
        `judgeCases.jsonl line ${i + 1}: ${result.error.issues[0]?.message ?? 'invalid'}`,
      );
    }
    if (seen.has(result.data.id)) {
      throw new Error(`judgeCases.jsonl line ${i + 1}: duplicate case id "${result.data.id}"`);
    }
    seen.add(result.data.id);
    cases.push(result.data);
  }

  return cases;
}

export function loadJudgeCases(path: string): JudgeMetaCase[] {
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is the tool's fixed dataset location or an explicit CLI argument
  return parseJudgeCases(readFileSync(path, 'utf8'));
}
