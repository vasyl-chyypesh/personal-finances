import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Logger } from '../../api/shared/logger.js';
import { CATEGORY_CATALOG } from '../../api/categories/categories.catalog.js';
import { createLedgerExtractor } from '../../api/chat/chat.llm.js';
import { normalizeExtraction } from '../../api/chat/chat.service.js';
import type { Category } from '../../api/categories/categories.types.js';
import type { RawExtraction } from '../../api/chat/chat.types.js';
import { loadCases } from './loadCases.js';
import { gradeFields, type GradedExtraction } from './fieldGrader.js';
import { buildReport, formatReport } from './report.js';
import type { CaseResult, EvalCase } from './eval.types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CASES = path.join(__dirname, 'cases.jsonl');

interface CliArgs {
  casesPath: string;
  filter?: string;
  threshold?: number;
  model?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string) => argv.find((a) => a.startsWith(`${name}=`))?.split('=')[1];
  const threshold = get('--threshold');
  return {
    casesPath: get('--cases') ?? DEFAULT_CASES,
    filter: get('--filter'),
    model: get('--model'),
    threshold: threshold != null ? Number(threshold) : undefined,
  };
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

  const categories = catalogCategories();
  const extractCtx = { categories: categories.map((c) => ({ slug: c.slug, names: c.names })) };

  Logger.log(`Running ${cases.length} case(s) against "${model}"…`);
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
      results.push({ case: testCase, fields, pass: fields.every((f) => f.pass) });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ case: testCase, fields: [], pass: false, error: message });
    }
  }

  const report = buildReport(results);
  Logger.log('\n' + formatReport(report, { model }));

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
