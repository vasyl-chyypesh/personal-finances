import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Logger } from '../../api/shared/logger.js';
import { createLlmJudge } from '../chat/llmJudge.js';
import { loadJudgeCases } from './loadJudgeCases.js';
import type { JudgeMetaCase } from './judgeEval.types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CASES = path.join(__dirname, 'judgeCases.jsonl');

interface CliArgs {
  casesPath: string;
  filter?: string;
  model?: string;
  threshold?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string) => argv.find((a) => a.startsWith(`${name}=`))?.split('=')[1];
  const threshold = get('--threshold');
  return {
    casesPath: get('--cases') ?? DEFAULT_CASES,
    filter: get('--filter'),
    model: get('--judge-model') ?? get('--model'),
    threshold: threshold != null ? Number(threshold) : undefined,
  };
}

interface MetaResult {
  case: JudgeMetaCase;
  descriptionOk: boolean;
  uncertaintyOk: boolean;
  detail: string;
  error?: string;
}

function pct(n: number, total: number): string {
  return total === 0 ? '—' : `${((n / total) * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const judge = createLlmJudge({ model: args.model });
  if (!judge.isAvailable()) {
    Logger.error(
      'No judge model configured — set EVAL_JUDGE_MODEL/CHAT_MODEL or pass --judge-model=<name>.',
    );
    process.exit(1);
  }
  const model =
    args.model?.trim() ||
    process.env['EVAL_JUDGE_MODEL']?.trim() ||
    process.env['CHAT_MODEL']?.trim() ||
    '';

  let cases = loadJudgeCases(args.casesPath);
  if (args.filter) cases = cases.filter((c) => c.id.includes(args.filter as string));
  if (cases.length === 0) {
    Logger.error('No meta-cases to run (check --cases / --filter).');
    process.exit(1);
  }

  Logger.log(`Validating judge "${model}" on ${cases.length} meta-case(s)…`);
  const results: MetaResult[] = [];
  for (const metaCase of cases) {
    try {
      const verdict = await judge.judge(metaCase.input);
      const descriptionOk = verdict.description.pass === (metaCase.expect.description === 'pass');
      const uncertaintyOk = verdict.uncertainty.pass === (metaCase.expect.uncertainty === 'pass');
      const got = (b: boolean) => (b ? 'pass' : 'fail');
      results.push({
        case: metaCase,
        descriptionOk,
        uncertaintyOk,
        detail:
          `description: judge=${got(verdict.description.pass)} expected=${metaCase.expect.description}` +
          ` | uncertainty: judge=${got(verdict.uncertainty.pass)} expected=${metaCase.expect.uncertainty}`,
      });
    } catch (err) {
      results.push({
        case: metaCase,
        descriptionOk: false,
        uncertaintyOk: false,
        detail: '',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const total = results.length;
  const descOk = results.filter((r) => r.descriptionOk).length;
  const uncOk = results.filter((r) => r.uncertaintyOk).length;
  const bothOk = results.filter((r) => r.descriptionOk && r.uncertaintyOk).length;

  const lines = [
    `Judge meta-eval — judge=${model}  (${total} cases)`,
    `Both criteria correct: ${bothOk}/${total} (${pct(bothOk, total)})`,
    `Description criterion:  ${descOk}/${total} (${pct(descOk, total)})`,
    `Uncertainty criterion: ${uncOk}/${total} (${pct(uncOk, total)})`,
  ];
  const misses = results.filter((r) => r.error || !r.descriptionOk || !r.uncertaintyOk);
  if (misses.length > 0) {
    lines.push('Mismatches:');
    for (const r of misses) {
      lines.push(`  ${r.case.id.padEnd(28)} ${r.error ? `error: ${r.error}` : r.detail}`);
    }
  }
  Logger.log('\n' + lines.join('\n'));

  const accuracy = total === 0 ? 0 : (bothOk / total) * 100;
  if (args.threshold != null && accuracy < args.threshold) {
    Logger.error(`Judge accuracy ${accuracy.toFixed(1)}% is below threshold ${args.threshold}%.`);
    process.exit(1);
  }
}

main().catch((err) => {
  Logger.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
