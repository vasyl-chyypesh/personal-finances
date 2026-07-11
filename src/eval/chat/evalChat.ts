import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Logger } from '../../api/shared/logger.js';
import { CATEGORY_CATALOG } from '../../api/categories/categories.catalog.js';
import { createLedgerExtractor } from '../../api/chat/chat.llm.js';
import { normalizeExtraction } from '../../api/chat/chat.service.js';
import type { Category } from '../../api/categories/categories.types.js';
import type { RawExtraction, UncertainField } from '../../api/chat/chat.types.js';
import { loadCases } from './loadCases.js';
import { gradeFields, type GradedExtraction } from './fieldGrader.js';
import { buildReport, formatReport } from './report.js';
import { createLlmJudge } from './llmJudge.js';
import type { CaseResult, EvalCase, ILlmJudge, JudgeVerdict } from './eval.types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CASES = path.join(__dirname, 'cases.jsonl');

interface CliArgs {
  casesPath: string;
  filter?: string;
  threshold?: number;
  model?: string;
  judgeModel?: string;
  noJudge: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string) => argv.find((a) => a.startsWith(`${name}=`))?.split('=')[1];
  const threshold = get('--threshold');
  return {
    casesPath: get('--cases') ?? DEFAULT_CASES,
    filter: get('--filter'),
    model: get('--model'),
    judgeModel: get('--judge-model'),
    noJudge: argv.includes('--no-judge'),
    threshold: threshold != null ? Number(threshold) : undefined,
  };
}

/** Judge the subjective fields; on judge failure, mark both criteria failed so it shows. */
async function judgeCase(
  judge: ILlmJudge,
  testCase: EvalCase,
  actualDescription: string | null,
  flaggedByModel: UncertainField[],
): Promise<JudgeVerdict> {
  try {
    return await judge.judge({
      message: testCase.message,
      expectedDescription: testCase.expected.description,
      actualDescription,
      descriptionRubric: testCase.descriptionRubric,
      flaggedByModel,
      uncertaintyRubric: testCase.uncertaintyRubric,
    });
  } catch (err) {
    const reason = `judge error: ${err instanceof Error ? err.message : String(err)}`;
    return { description: { pass: false, reason }, uncertainty: { pass: false, reason } };
  }
}

/** Synthetic Category rows from the catalog, with stable ids for slug resolution. */
function catalogCategories(): Category[] {
  return CATEGORY_CATALOG.map((def, i) => ({ id: i + 1, slug: def.slug, names: def.names }));
}

/** Build the graded expected side by normalizing the hand-labeled extraction. */
function expectedSide(testCase: EvalCase, categories: Category[]): GradedExtraction {
  const raw: RawExtraction = { ...testCase.expected, uncertainFields: [] };
  return { norm: normalizeExtraction(raw, categories, testCase.today), slug: raw.categorySlug };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.model != null) process.env['CHAT_MODEL'] = args.model;
  const extractor = createLedgerExtractor();
  if (!extractor.isAvailable()) {
    Logger.error('CHAT_MODEL is empty — set it (or pass --model=<name>) to run the eval.');
    process.exit(1);
  }
  const model = process.env['CHAT_MODEL'] ?? '';

  let cases = loadCases(args.casesPath);
  if (args.filter) {
    const needle = args.filter;
    cases = cases.filter((c) => c.id.includes(needle) || c.locale === needle);
  }
  if (cases.length === 0) {
    Logger.error('No cases to run (check --cases / --filter).');
    process.exit(1);
  }

  const judge = createLlmJudge({ model: args.judgeModel });
  const judging = !args.noJudge && judge.isAvailable();
  // Mirror createLlmJudge's precedence: --judge-model, then EVAL_JUDGE_MODEL, then the extractor model.
  const judgeModel = args.judgeModel?.trim() || process.env['EVAL_JUDGE_MODEL']?.trim() || model;

  const categories = catalogCategories();
  const extractCtx = { categories: categories.map((c) => ({ slug: c.slug, names: c.names })) };

  const judgeNote = judging ? ` (judge: ${judgeModel})` : ' (deterministic only)';
  Logger.log(`Running ${cases.length} case(s) against "${model}"${judgeNote}…`);
  const results: CaseResult[] = [];
  for (const testCase of cases) {
    const expected = expectedSide(testCase, categories);
    try {
      const raw = await extractor.extract(testCase.message, {
        ...extractCtx,
        today: testCase.today,
      });
      const actual: GradedExtraction = {
        norm: normalizeExtraction(raw, categories, testCase.today),
        slug: raw.categorySlug,
      };
      const fields = gradeFields(expected, actual);
      const verdict = judging
        ? await judgeCase(
            judge,
            testCase,
            actual.norm.draft.description ?? null,
            raw.uncertainFields,
          )
        : undefined;
      const pass =
        fields.every((f) => f.pass) &&
        (verdict == null || (verdict.description.pass && verdict.uncertainty.pass));
      results.push({ case: testCase, fields, judge: verdict, pass });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ case: testCase, fields: [], pass: false, error: message });
    }
  }

  const report = buildReport(results);
  Logger.log('\n' + formatReport(report, { model, judgeModel: judging ? judgeModel : undefined }));

  if (args.threshold != null && report.passRate * 100 < args.threshold) {
    Logger.error(
      `Pass rate ${(report.passRate * 100).toFixed(1)}% is below threshold ${args.threshold}%.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  Logger.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
