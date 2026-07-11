import { Ollama } from 'ollama';
import { Logger } from '../../api/shared/logger.js';
import type { ILlmJudge, JudgeInput, JudgeVerdict } from './eval.types.js';

const DEFAULT_HOST = 'http://127.0.0.1:11434';
/** Grading must be deterministic — no creativity. */
const TEMPERATURE = 0;

/** JSON-schema constraint for the judge's reply (discrete verdicts + reasons). */
export const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    descriptionVerdict: { type: 'string', enum: ['pass', 'fail'] },
    descriptionReason: { type: 'string' },
    uncertaintyVerdict: { type: 'string', enum: ['pass', 'fail'] },
    uncertaintyReason: { type: 'string' },
  },
  required: ['descriptionVerdict', 'descriptionReason', 'uncertaintyVerdict', 'uncertaintyReason'],
} as const;

interface JudgeMessage {
  role: 'system' | 'user';
  content: string;
}

/** Build the (system, user) messages for one grading request. */
export function buildJudgeMessages(input: JudgeInput): JudgeMessage[] {
  const system = [
    'You are a strict grader for a personal-finance extraction assistant. The',
    'assistant reads ONE user message and fills a ledger entry. Judge ONLY two',
    'things and reply with the JSON object the schema describes.',
    '',
    "1) description — pass when the assistant's description captures the place or",
    '   payee named in the message (or is empty when the message names none) and',
    '   does NOT merely repeat the category; fail otherwise.',
    '2) uncertainty — pass when the fields the assistant flagged for the user to',
    '   double-check are reasonable: it should flag values it set from weak or',
    '   ambiguous cues, and must NOT flag values that are clearly stated or simply',
    '   absent (the app defaults absent values on its own); fail otherwise.',
    '',
    'Give a short reason for each verdict. Judge only these two criteria.',
  ].join('\n');

  const flagged =
    input.flaggedByModel.length > 0 ? `[${input.flaggedByModel.join(', ')}]` : '[] (none)';

  const user = [
    `Message: "${input.message}"`,
    `Expected description: ${input.expectedDescription ?? '(none)'}`,
    `Assistant description: ${input.actualDescription ?? '(none)'}`,
    `Description guidance: ${input.descriptionRubric ?? '(none)'}`,
    '',
    `Fields the assistant flagged as uncertain: ${flagged}`,
    `Uncertainty guidance: ${input.uncertaintyRubric ?? '(none)'}`,
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

/**
 * Parse the judge's reply into a {@link JudgeVerdict}. Mirrors the extractor's
 * defensive parsing (`chat.llm.ts`): strip a ```json fence or surrounding prose
 * before `JSON.parse`, since some engines ignore the schema `format`.
 */
export function parseJudgeVerdict(content: string): JudgeVerdict {
  let text = content.trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) text = fenced[1].trim();
  if (!text.startsWith('{')) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('judge returned a response that could not be parsed');
  }

  const isPass = (v: unknown) => String(v).toLowerCase() === 'pass';
  const reason = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    description: {
      pass: isPass(raw['descriptionVerdict']),
      reason: reason(raw['descriptionReason']),
    },
    uncertainty: {
      pass: isPass(raw['uncertaintyVerdict']),
      reason: reason(raw['uncertaintyReason']),
    },
  };
}

/** The subset of the Ollama client the judge drives. Lets tests inject a fake. */
export type JudgeChatFn = (messages: JudgeMessage[], format: object) => Promise<string>;

export interface JudgeDeps {
  /** Injected chat call (tests). When omitted, a real Ollama client is used. */
  chat?: JudgeChatFn;
  /** Judge model; defaults to `EVAL_JUDGE_MODEL`, then `CHAT_MODEL`. */
  model?: string;
}

/**
 * Local Ollama-backed judge. Pulls the model on first use if missing (real client
 * only). An empty model makes it unavailable. Tests inject `chat` so no daemon is
 * contacted.
 */
export function createLlmJudge(deps: JudgeDeps = {}): ILlmJudge {
  const model = (
    deps.model ??
    process.env['EVAL_JUDGE_MODEL'] ??
    process.env['CHAT_MODEL'] ??
    ''
  ).trim();
  const client = deps.chat
    ? null
    : new Ollama({ host: process.env['OLLAMA_HOST']?.trim() || DEFAULT_HOST });
  let ensured: Promise<void> | null = null;

  const chat: JudgeChatFn =
    deps.chat ??
    (async (messages, format) => {
      const res = await client!.chat({
        model,
        stream: false,
        format,
        options: { temperature: TEMPERATURE },
        messages,
      });
      return res.message.content;
    });

  async function ensureModel(): Promise<void> {
    if (!client) return;
    if (!ensured) {
      ensured = (async () => {
        const { models } = await client.list();
        if (!models.some((m) => m.name === model || m.model === model)) {
          Logger.log(`Pulling judge model "${model}" (first use)…`);
          await client.pull({ model });
          Logger.log(`Judge model ready: ${model}`);
        }
      })().catch((err) => {
        ensured = null;
        throw err;
      });
    }
    return ensured;
  }

  return {
    isAvailable: () => model.length > 0,
    async judge(input) {
      await ensureModel();
      return parseJudgeVerdict(await chat(buildJudgeMessages(input), JUDGE_SCHEMA));
    },
  };
}
