import { Ollama } from 'ollama';
import { Logger } from '../shared/logger.js';
import { HttpError } from '../shared/errors/httpError.js';
import { CODES } from '../shared/errors/codes.js';
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

/** The calendar day before an ISO date (UTC), for relative-date examples. */
function previousDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function buildSystemPrompt(ctx: ExtractContext): string {
  const categoryLines = ctx.categories
    .map((c) => `- ${c.slug}: ${c.names.en ?? c.slug}${c.names.uk ? ` / ${c.names.uk}` : ''}`)
    .join('\n');

  const today = ctx.today;
  const yesterday = previousDay(today);

  // Renders one XML-delimited few-shot example. Examples use the real resolved
  // dates so they stay consistent with the date rule (relative words -> YYYY-MM-DD;
  // no date mentioned -> null). They are invented — none reuses a golden eval case —
  // so the eval stays a fair test of the prompt.
  const example = (message: string, json: Record<string, unknown>): string =>
    `<example>\n<message>${message}</message>\n<json>${JSON.stringify(json)}</json>\n</example>`;

  return [
    '<role>',
    'You extract a single personal-finance ledger entry from one short message.',
    'The user writes in English or Ukrainian. Reply with ONLY the JSON object the schema describes — no prose, no code fence.',
    '</role>',
    '',
    '<date_rule>',
    `Today is ${today} (ISO). Resolve relative dates against it and output date as YYYY-MM-DD: "today"/"сьогодні" -> ${today}, "yesterday"/"вчора" -> ${yesterday}. If no date is mentioned, set date to null.`,
    '</date_rule>',
    '',
    '<fields>',
    '- amountMajor: the number in its main unit ("500" -> 500, "12.50" -> 12.5). Ignore thousands separators ("1 500"/"1,500" -> 1500). null if no amount is given.',
    '- currency: UAH, USD or EUR. "грн"/"uah"/"₴" -> UAH, "$"/"usd" -> USD, "€"/"eur" -> EUR. null if not stated.',
    '- type: "expense" for spending, "income" for money received — salary/зарплата, refund/повернення, cashback/кешбек, "отримав"/"received".',
    '- categorySlug: exactly one slug from <categories>, or null if none clearly fits. Never invent a slug, and prefer null over a weak guess.',
    '- description: ONLY a proper name of a place, payee, or person (e.g. "Silpo", "Puzata Hata", "John"). If the message names no such proper name, set description to null. Never put the item, product, category, or a generic place-type in description — "jacket", "groceries", "restaurant", "fuel", «продукти», «ресторан» are all wrong; use null instead.',
    '- Set any field you cannot determine from the message to null.',
    '- If the message is not about a transaction (a greeting, a question, small talk), set every field to null and uncertainFields to [].',
    '</fields>',
    '',
    '<uncertainty_rules>',
    '- uncertainFields flags values the user should double-check. List a field name ONLY when you set it to a NON-null value you are not fully confident about — e.g. you inferred "type" from weak cues, or "categorySlug" only loosely fits.',
    '- Do NOT list a field you set to null; the app fills in defaults for missing values on its own.',
    '- A date you resolved from a clear relative word ("today"/"сьогодні"/"yesterday"/"вчора") is stated, not a guess — do NOT flag it.',
    '- Allowed names: "type", "amount", "currency", "category", "date" (use "amount" for a doubtful amountMajor and "category" for a shaky categorySlug).',
    '- When every value you set is clearly stated in the message, return an empty list.',
    '</uncertainty_rules>',
    '',
    '<categories>',
    '(slug: English / Ukrainian)',
    categoryLines,
    '</categories>',
    '',
    '<examples>',
    example('spent 500 on groceries', {
      type: 'expense',
      amountMajor: 500,
      currency: null,
      categorySlug: 'grocery',
      description: null,
      date: null,
      uncertainFields: [],
    }),
    example('500 грн таксі вчора', {
      type: 'expense',
      amountMajor: 500,
      currency: 'UAH',
      categorySlug: 'transport',
      description: null,
      date: yesterday,
      uncertainFields: [],
    }),
    example('got 20000 salary', {
      type: 'income',
      amountMajor: 20000,
      currency: null,
      categorySlug: 'salary',
      description: null,
      date: null,
      uncertainFields: [],
    }),
    example('paid $15.50 for lunch at Puzata Hata today', {
      type: 'expense',
      amountMajor: 15.5,
      currency: 'USD',
      categorySlug: 'eating-out',
      description: 'Puzata Hata',
      date: today,
      uncertainFields: [],
    }),
    example('1200 за світло', {
      type: 'expense',
      amountMajor: 1200,
      currency: null,
      categorySlug: 'electricity',
      description: null,
      date: null,
      uncertainFields: [],
    }),
    example('1000 from John', {
      type: 'income',
      amountMajor: 1000,
      currency: null,
      categorySlug: null,
      description: 'John',
      date: null,
      uncertainFields: ['type'],
    }),
    // Contrastive: the item name is NOT a description — no place/payee named -> null.
    example('spent 250 on shoes', {
      type: 'expense',
      amountMajor: 250,
      currency: null,
      categorySlug: 'footwear',
      description: null,
      date: null,
      uncertainFields: [],
    }),
    example('купив навушники 900', {
      type: 'expense',
      amountMajor: 900,
      currency: null,
      categorySlug: 'electronics',
      description: null,
      date: null,
      uncertainFields: [],
    }),
    example('кешбек від банку 300', {
      type: 'income',
      amountMajor: 300,
      currency: null,
      categorySlug: 'cashback',
      description: null,
      date: null,
      uncertainFields: [],
    }),
    example('how much did I spend this month?', {
      type: null,
      amountMajor: null,
      currency: null,
      categorySlug: null,
      description: null,
      date: null,
      uncertainFields: [],
    }),
    '</examples>',
    '',
    'Reply with ONLY the JSON object described by the schema.',
  ].join('\n');
}

/**
 * Parse the model's reply into a {@link RawExtraction}. Ollama enforces the
 * JSON-schema `format` for llama.cpp models, but some engines (e.g. MLX) ignore
 * it and wrap the JSON in a ```json code fence or surround it with prose — so
 * strip a fence and fall back to the outermost `{ … }` before parsing.
 */
export function parseExtraction(content: string): RawExtraction {
  let text = content.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) text = fenced[1].trim();

  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text) as RawExtraction;
  } catch {
    throw new HttpError(
      'The AI model returned a response that could not be parsed',
      CODES.CHAT_BAD_RESPONSE,
      502,
    );
  }
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
      return parseExtraction(res.message.content);
    },
  };
}
