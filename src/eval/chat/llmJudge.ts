import { Ollama } from 'ollama';
import { Logger } from '../../api/shared/logger.js';
import type { ILlmJudge, JudgeCriterion, JudgeInput, JudgeVerdict } from './eval.types.js';

const DEFAULT_HOST = 'http://127.0.0.1:11434';
/** Grading must be deterministic — no creativity. */
const TEMPERATURE = 0;

/** One criterion object: `reason` before `verdict` so the model reasons first (CoT). */
const CRITERION_SCHEMA = {
  type: 'object',
  properties: {
    reason: { type: 'string' },
    verdict: { type: 'string', enum: ['pass', 'fail'] },
  },
  required: ['reason', 'verdict'],
} as const;

/**
 * JSON-schema constraint for the judge's reply. Nested by criterion — matching
 * both the `JudgeVerdict` domain type and the shape models naturally emit for a
 * two-criteria rubric (which is what MLX engines fall back to when they ignore
 * the `format` grammar). Each criterion keeps `reason` before `verdict` (CoT).
 */
export const JUDGE_SCHEMA = {
  type: 'object',
  properties: {
    description: CRITERION_SCHEMA,
    uncertainty: CRITERION_SCHEMA,
  },
  required: ['description', 'uncertainty'],
} as const;

interface JudgeMessage {
  role: 'system' | 'user';
  content: string;
}

/**
 * The judge system prompt. Follows Anthropic prompt-engineering practice: a clear
 * role, XML-delimited criteria with explicit edge cases, chain-of-thought
 * (reason before verdict) plus a self-consistency rule so the verdict follows the
 * reason, and few-shot pass/fail examples. The examples are invented and do NOT
 * reuse golden-dataset cases, so the eval stays a fair test.
 */
const JUDGE_SYSTEM_PROMPT = `You are a strict but fair grader for a personal-finance extraction assistant. The assistant reads ONE user message and fills in a ledger entry. You grade ONLY the two criteria below. Reply with ONLY the JSON object shown in the <output> of the examples — no prose, headings, or text before or after it.

<criteria>
1. description — Does the assistant's "description" correctly capture the place or payee?
   - PASS: it names the specific place/payee/person from the message (e.g. "Silpo", "Maria").
   - PASS: the message names no specific place or payee, and the description is empty.
   - FAIL: it merely repeats the category or item type instead of a name (e.g. "Groceries", "Coffee", "jacket").
   - FAIL: the message clearly names a place or payee, but the description is empty or wrong.

2. uncertainty — Are the fields the assistant flagged for the user to double-check reasonable?
   - PASS: it flags only values it set from weak or ambiguous cues (an inferred type, a loosely-fitting category).
   - PASS: nothing is flagged and every value the assistant set is clearly stated in the message.
   - FAIL: it flags a value that is clearly stated in the message (there is nothing to double-check).
   - FAIL: it does not flag a value it clearly guessed from weak cues.
   - Values the message does NOT state are filled in by the app automatically and must NOT be flagged — an empty flag list for a message that omits currency or date is correct, not a failure.
</criteria>

In each criterion object put ONE short sentence in "reason" and then the "verdict". The verdict MUST follow the reasoning: if your reason concludes the assistant handled the field correctly, the verdict is "pass"; if it concludes the assistant got it wrong, the verdict is "fail". Never pair a "correct"/"aligns"/"is right" reason with a "fail" verdict. Grade the two criteria independently and ignore all other fields.

Each example below shows the <input> and the exact <output> JSON you must produce.

<examples>
<example>
<input>
<message>lunch at Kanapa 320</message>
<expected_description>Kanapa</expected_description>
<assistant_description>Kanapa</assistant_description>
<flagged_fields>[] (none)</flagged_fields>
</input>
<output>{"description":{"reason":"Names the specific restaurant, Kanapa.","verdict":"pass"},"uncertainty":{"reason":"Every value the assistant set is clearly stated and nothing is flagged, which is correct.","verdict":"pass"}}</output>
</example>
<example>
<input>
<message>spent 200 on clothes</message>
<expected_description>(none)</expected_description>
<assistant_description>Clothes</assistant_description>
<flagged_fields>[amount]</flagged_fields>
</input>
<output>{"description":{"reason":"Only repeats the category instead of naming a place or payee.","verdict":"fail"},"uncertainty":{"reason":"The amount 200 is clearly stated, so flagging it is wrong.","verdict":"fail"}}</output>
</example>
<example>
<input>
<message>got 5000 bonus</message>
<expected_description>(none)</expected_description>
<assistant_description>(none)</assistant_description>
<flagged_fields>[type]</flagged_fields>
</input>
<output>{"description":{"reason":"No place or payee is named, so an empty description is correct.","verdict":"pass"},"uncertainty":{"reason":"Type was inferred from a weak cue, so flagging it for review is reasonable.","verdict":"pass"}}</output>
</example>
</examples>`;

/** Build the (system, user) messages for one grading request. */
export function buildJudgeMessages(input: JudgeInput): JudgeMessage[] {
  const flagged =
    input.flaggedByModel.length > 0 ? `[${input.flaggedByModel.join(', ')}]` : '[] (none)';

  const user = [
    'Grade this case:',
    '',
    `<message>${input.message}</message>`,
    `<expected_description>${input.expectedDescription ?? '(none)'}</expected_description>`,
    `<assistant_description>${input.actualDescription ?? '(none)'}</assistant_description>`,
    `<description_guidance>${input.descriptionRubric ?? '(none)'}</description_guidance>`,
    `<flagged_fields>${flagged}</flagged_fields>`,
    `<uncertainty_guidance>${input.uncertaintyRubric ?? '(none)'}</uncertainty_guidance>`,
  ].join('\n');

  return [
    { role: 'system', content: JUDGE_SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

/** Read one nested criterion; throws when it's absent so a shape mismatch surfaces. */
function readCriterion(
  raw: Record<string, unknown>,
  key: 'description' | 'uncertainty',
): JudgeCriterion {
  // eslint-disable-next-line security/detect-object-injection -- key is a typed 'description' | 'uncertainty' literal
  const obj = raw[key];
  if (obj == null || typeof obj !== 'object') {
    throw new Error(`judge reply is missing the "${key}" criterion`);
  }
  const c = obj as Record<string, unknown>;
  return {
    pass: String(c['verdict']).toLowerCase() === 'pass',
    reason: typeof c['reason'] === 'string' ? c['reason'] : '',
  };
}

/**
 * Parse the judge's reply into a {@link JudgeVerdict}. Mirrors the extractor's
 * defensive parsing (`chat.llm.ts`): strip a ```json fence or surrounding prose
 * before `JSON.parse`, since some engines ignore the schema `format`. Expects the
 * nested `{ description: { reason, verdict }, uncertainty: {…} }` shape and throws
 * when a criterion is missing — so a wrong-shape reply fails loudly (as a per-case
 * judge error) instead of silently grading every case as fail.
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

  return {
    description: readCriterion(raw, 'description'),
    uncertainty: readCriterion(raw, 'uncertainty'),
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
