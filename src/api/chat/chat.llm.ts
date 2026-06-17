import { Ollama } from 'ollama';
import { Logger } from '../shared/logger.js';
import type { ExtractContext, ILedgerExtractor, RawExtraction } from './chat.types.js';

/** Default model: Gemma 4 12B (MLX), served by a local Ollama daemon. */
const DEFAULT_MODEL = 'gemma4:12b-mlx';
const DEFAULT_HOST = 'http://127.0.0.1:11434';
/** Keep extraction deterministic — we want parsing, not creativity. */
const TEMPERATURE = 0.1;

function chatModel(): string {
  // An explicitly empty value disables the feature; unset falls back to default.
  const raw = process.env['CHAT_MODEL'];
  return raw === undefined ? DEFAULT_MODEL : raw.trim();
}

function ollamaHost(): string {
  return process.env['OLLAMA_HOST']?.trim() || DEFAULT_HOST;
}

/** JSON-schema constraint for Ollama; `categorySlug` is limited to real slugs (or null). */
function buildSchema(slugs: readonly string[]): object {
  const categorySlug =
    slugs.length > 0
      ? { anyOf: [{ type: 'string', enum: [...slugs] }, { type: 'null' }] }
      : { type: 'null' };

  return {
    type: 'object',
    properties: {
      type: { anyOf: [{ type: 'string', enum: ['income', 'expense'] }, { type: 'null' }] },
      amountMajor: { type: ['number', 'null'] },
      currency: { anyOf: [{ type: 'string', enum: ['UAH', 'USD', 'EUR'] }, { type: 'null' }] },
      categorySlug,
      description: { type: ['string', 'null'] },
      date: { type: ['string', 'null'] },
      uncertainFields: {
        type: 'array',
        items: { type: 'string', enum: ['type', 'amount', 'currency', 'category', 'date'] },
      },
    },
    required: [
      'type',
      'amountMajor',
      'currency',
      'categorySlug',
      'description',
      'date',
      'uncertainFields',
    ],
  };
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
 * Ollama-backed extractor. The model runs in a local Ollama daemon (no model
 * code in this process); it is pulled on first use if missing. The feature is
 * optional — an empty `CHAT_MODEL` disables it, and tests inject a fake.
 */
export function createLedgerExtractor(): ILedgerExtractor {
  const model = chatModel();
  const client = new Ollama({ host: ollamaHost() });
  let ensured: Promise<void> | null = null;

  async function hasModel(): Promise<boolean> {
    const { models } = await client.list();
    return models.some((m) => m.name === model || m.model === model);
  }

  /** Pull the model on first use if the daemon doesn't have it yet. */
  async function ensureModel(): Promise<void> {
    if (!ensured) {
      ensured = (async () => {
        if (!(await hasModel())) {
          Logger.log(`Pulling chat model "${model}" (first use)…`);
          await client.pull({ model });
          Logger.log(`Chat model ready: ${model}`);
        }
      })().catch((err) => {
        ensured = null; // allow a later retry
        throw err;
      });
    }
    return ensured;
  }

  return {
    isAvailable() {
      return model.length > 0;
    },
    async isReady() {
      try {
        return await hasModel();
      } catch {
        // Daemon unreachable or errored — treat as not ready.
        return false;
      }
    },
    async extract(message, ctx) {
      await ensureModel();
      const res = await client.chat({
        model,
        stream: false,
        format: buildSchema(ctx.categories.map((c) => c.slug)),
        options: { temperature: TEMPERATURE },
        messages: [
          { role: 'system', content: buildSystemPrompt(ctx) },
          { role: 'user', content: message },
        ],
      });
      return JSON.parse(res.message.content) as RawExtraction;
    },
  };
}
