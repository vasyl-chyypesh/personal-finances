import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Logger } from '../../api/shared/logger.js';
import { loadCases } from './loadCases.js';
import { buildIndexHtml, buildRunHtml, type RunLink } from './reportHtml.js';
import type { EvalCase } from './eval.types.js';
import type { JsonArtifact } from './report.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_RESULTS_DIR = path.join(__dirname, 'results');
const DEFAULT_CASES = path.join(__dirname, 'cases.jsonl');
/** Only render the eval's own run artifacts, never the generated `.html` alongside them. */
const ARTIFACT_RE = /^chat-eval-.*\.json$/;

interface CliArgs {
  resultsDir: string;
  casesPath: string;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (name: string) => argv.find((a) => a.startsWith(`${name}=`))?.split('=')[1];
  return {
    resultsDir: get('--results-dir') ?? DEFAULT_RESULTS_DIR,
    casesPath: get('--cases') ?? DEFAULT_CASES,
  };
}

/** Minimal shape guard so a stray/old JSON file in the dir can't crash rendering. */
function isArtifact(x: unknown): x is JsonArtifact {
  if (x == null || typeof x !== 'object') return false;
  const a = x as Record<string, unknown>;
  return (
    typeof a['generatedAt'] === 'string' &&
    typeof a['model'] === 'string' &&
    a['summary'] != null &&
    typeof a['summary'] === 'object' &&
    Array.isArray(a['cases'])
  );
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  let files: string[];
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- resultsDir is the tool's default results dir or an explicit CLI argument
    files = readdirSync(args.resultsDir).filter((f) => ARTIFACT_RE.test(f));
  } catch {
    Logger.error(`Cannot read results dir: ${args.resultsDir}`);
    process.exit(1);
  }
  if (files.length === 0) {
    Logger.error(
      `No chat-eval-*.json artifacts in ${args.resultsDir} — run "npm run eval:chat" first.`,
    );
    process.exit(1);
  }

  // Join key: case id -> the dataset case (message + rubrics live here, not in the artifact).
  const casesById = new Map<string, EvalCase>(loadCases(args.casesPath).map((c) => [c.id, c]));

  const runs: RunLink[] = [];
  for (const file of files) {
    const full = path.join(args.resultsDir, file);
    let parsed: unknown;
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- file is a chat-eval-*.json entry from the results dir
      parsed = JSON.parse(readFileSync(full, 'utf8'));
    } catch {
      Logger.log(`Skipping ${file}: not valid JSON`);
      continue;
    }
    if (!isArtifact(parsed)) {
      Logger.log(`Skipping ${file}: not a run artifact`);
      continue;
    }
    const href = file.replace(/\.json$/, '.html');
    const outPath = path.join(args.resultsDir, href);
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- outPath is inside the tool's results dir
      writeFileSync(outPath, buildRunHtml(parsed, casesById));
    } catch (err) {
      // A shape-valid-but-malformed artifact shouldn't abort the whole batch — skip it.
      Logger.log(`Skipping ${file}: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    runs.push({ artifact: parsed, href });
  }

  if (runs.length === 0) {
    Logger.error('No valid run artifacts to render.');
    process.exit(1);
  }

  const indexPath = path.join(args.resultsDir, 'index.html');
  // eslint-disable-next-line security/detect-non-literal-fs-filename -- indexPath is inside the tool's results dir
  writeFileSync(indexPath, buildIndexHtml(runs));

  Logger.log(`Rendered ${runs.length} run report(s) into ${args.resultsDir}`);
  Logger.log(`Open: file://${path.resolve(indexPath)}`);
}

try {
  main();
} catch (err) {
  Logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}
