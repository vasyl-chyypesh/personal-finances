import path from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import type {
  GbnfJsonSchema,
  Llama,
  LlamaContext,
  LlamaModel,
  LlamaJsonSchemaGrammar,
} from 'node-llama-cpp';
import { Logger } from '../shared/logger.js';
import type { ExtractContext, ILedgerExtractor, RawExtraction } from './chat.types.js';

/** Default model: Gemma 4 E4B-it, Q4_K_M GGUF, fetched from Hugging Face on first use. */
const DEFAULT_MODEL_URI = 'hf:unsloth/gemma-4-E4B-it-GGUF:Q4_K_M';
/** Keep extraction deterministic — we want parsing, not creativity. */
const TEMPERATURE = 0.1;

interface Engine {
  llama: Llama;
  model: LlamaModel;
  context: LlamaContext;
  /** The node-llama-cpp module namespace (loaded lazily). */
  mod: typeof import('node-llama-cpp');
}

function modelUri(): string {
  // An explicitly empty value disables the feature; unset falls back to default.
  const raw = process.env['CHAT_MODEL_URI'];
  return raw === undefined ? DEFAULT_MODEL_URI : raw.trim();
}

function modelsDir(): string {
  return process.env['CHAT_MODELS_DIR']?.trim() || path.resolve(process.cwd(), 'models');
}

/** A GGUF already sitting in the models dir means no download on next use. */
function hasLocalModel(): boolean {
  const dir = modelsDir();
  // The path is operator config (env or ./models), never user input.
  /* eslint-disable security/detect-non-literal-fs-filename */
  if (!existsSync(dir)) return false;
  try {
    return readdirSync(dir).some((f) => f.endsWith('.gguf'));
  } catch {
    return false;
  }
  /* eslint-enable security/detect-non-literal-fs-filename */
}

/** JSON-schema grammar; `categorySlug` is constrained to real slugs (or null). */
function buildSchema(slugs: readonly string[]): GbnfJsonSchema {
  const categorySlug: GbnfJsonSchema =
    slugs.length > 0 ? { oneOf: [{ enum: [...slugs] }, { type: 'null' }] } : { type: 'null' };

  return {
    type: 'object',
    properties: {
      type: { oneOf: [{ enum: ['income', 'expense'] }, { type: 'null' }] },
      amountMajor: { type: ['number', 'null'] },
      currency: { oneOf: [{ enum: ['UAH', 'USD', 'EUR'] }, { type: 'null' }] },
      categorySlug,
      description: { type: ['string', 'null'] },
      date: { type: ['string', 'null'] },
      uncertainFields: {
        type: 'array',
        items: { enum: ['type', 'amount', 'currency', 'category', 'date'] },
      },
    },
  } satisfies GbnfJsonSchema;
}

function buildSystemPrompt(ctx: ExtractContext): string {
  const categoryLines = ctx.categories
    .map((c) => `- ${c.slug}: ${c.names.en ?? c.slug}${c.names.uk ? ` / ${c.names.uk}` : ''}`)
    .join('\n');

  return [
    'You extract a single personal-finance ledger entry from one short message.',
    'The user writes in English or Ukrainian. Reply ONLY with the JSON object the schema describes.',
    `Today is ${ctx.today} (ISO). Resolve relative dates ("today/сьогодні", "yesterday/вчора") against it and output date as YYYY-MM-DD.`,
    'Rules:',
    '- amountMajor is the number in the message in its main unit (e.g. "500" -> 500, "12.50" -> 12.5).',
    '- currency: UAH, USD or EUR. "грн"/"uah"/"₴" -> UAH, "$"/"usd" -> USD, "€"/"eur" -> EUR.',
    '- type: "expense" for spending, "income" for money received (salary, refund, "отримав").',
    '- categorySlug MUST be one of the slugs below, or null if none clearly fits. Never invent a slug.',
    '- Set any field you cannot determine from the message to null.',
    '- uncertainFields: list the fields you are unsure about or had to guess.',
    '',
    'Available category slugs (slug: English / Ukrainian):',
    categoryLines,
    '',
    'Examples:',
    'Message: "spent 500 on groceries today"',
    'JSON: {"type":"expense","amountMajor":500,"currency":null,"categorySlug":"grocery","description":null,"date":null,"uncertainFields":["currency"]}',
    'Message: "500 грн таксі вчора"',
    'JSON: {"type":"expense","amountMajor":500,"currency":"UAH","categorySlug":"taxi","description":null,"date":null,"uncertainFields":[]}',
    'Message: "got 20000 salary"',
    'JSON: {"type":"income","amountMajor":20000,"currency":null,"categorySlug":"wages","description":null,"date":null,"uncertainFields":["currency"]}',
  ].join('\n');
}

/**
 * node-llama-cpp backed extractor. The native module and model are loaded lazily
 * on the first {@link extract} call (never at import or app boot), so the feature
 * stays optional and tests/CI that inject a fake never touch it.
 */
export function createLedgerExtractor(): ILedgerExtractor {
  let enginePromise: Promise<Engine> | null = null;
  const grammarCache = new Map<string, LlamaJsonSchemaGrammar<GbnfJsonSchema>>();
  // A context sequence is single-threaded; serialize prompts through this chain.
  let queue: Promise<unknown> = Promise.resolve();

  async function getEngine(): Promise<Engine> {
    if (!enginePromise) {
      enginePromise = (async () => {
        const mod = await import('node-llama-cpp');
        const resolvedPath = await mod.resolveModelFile(modelUri(), modelsDir());
        const llama = await mod.getLlama();
        const model = await llama.loadModel({ modelPath: resolvedPath });
        const context = await model.createContext();
        Logger.log(`Chat model loaded: ${path.basename(resolvedPath)}`);
        return { llama, model, context, mod };
      })().catch((err) => {
        enginePromise = null; // allow a later retry
        throw err;
      });
    }
    return enginePromise;
  }

  async function getGrammar(
    engine: Engine,
    slugs: readonly string[],
  ): Promise<LlamaJsonSchemaGrammar<GbnfJsonSchema>> {
    const key = [...slugs].sort().join(',');
    let grammar = grammarCache.get(key);
    if (!grammar) {
      // The schema is built dynamically (category slugs vary), so the strict
      // `const T` inference can't apply — cast to satisfy the generic.
      grammar = (await engine.llama.createGrammarForJsonSchema(
        buildSchema(slugs) as never,
      )) as LlamaJsonSchemaGrammar<GbnfJsonSchema>;
      grammarCache.set(key, grammar);
    }
    return grammar;
  }

  async function runExtraction(message: string, ctx: ExtractContext): Promise<RawExtraction> {
    const engine = await getEngine();
    const grammar = await getGrammar(
      engine,
      ctx.categories.map((c) => c.slug),
    );
    const sequence = engine.context.getSequence();
    const session = new engine.mod.LlamaChatSession({
      contextSequence: sequence,
      systemPrompt: buildSystemPrompt(ctx),
    });
    try {
      const raw = await session.prompt(message, { grammar, temperature: TEMPERATURE });
      return grammar.parse(raw) as unknown as RawExtraction;
    } finally {
      session.dispose();
      sequence.dispose();
    }
  }

  return {
    isAvailable() {
      return modelUri().length > 0;
    },
    isReady() {
      return hasLocalModel();
    },
    extract(message, ctx) {
      // Chain onto the queue so only one prompt runs on the sequence at a time.
      const run = queue.then(() => runExtraction(message, ctx));
      queue = run.catch(() => undefined);
      return run;
    },
  };
}
