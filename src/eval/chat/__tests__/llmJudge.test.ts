import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJudgeMessages,
  createLlmJudge,
  parseJudgeVerdict,
  type JudgeChatFn,
} from '../llmJudge.js';
import type { JudgeInput } from '../eval.types.js';

const INPUT: JudgeInput = {
  message: 'coffee at Aroma Kava for 85',
  expectedDescription: 'Aroma Kava',
  actualDescription: 'Aroma Kava',
  descriptionRubric: 'description should name the cafe',
  flaggedByModel: ['type'],
  uncertaintyRubric: 'type inferred from weak cues',
};

describe('buildJudgeMessages', () => {
  it('wraps the case data in XML tags and states the self-consistency rule', () => {
    const [system, user] = buildJudgeMessages(INPUT);
    assert.equal(system.role, 'system');
    assert.equal(user.role, 'user');
    assert.match(user.content, /<message>coffee at Aroma Kava for 85<\/message>/);
    assert.match(user.content, /<expected_description>Aroma Kava<\/expected_description>/);
    assert.match(user.content, /<flagged_fields>\[type\]<\/flagged_fields>/);
    // The self-consistency rule (verdict must follow the reason) lives in the system prompt.
    assert.match(system.content, /verdict MUST follow the reasoning/);
    assert.match(system.content, /<examples>/);
  });

  it('renders "(none)" for an absent description and "[] (none)" for no flags', () => {
    const [, user] = buildJudgeMessages({
      ...INPUT,
      actualDescription: null,
      flaggedByModel: [],
    });
    assert.match(user.content, /<assistant_description>\(none\)<\/assistant_description>/);
    assert.match(user.content, /<flagged_fields>\[\] \(none\)<\/flagged_fields>/);
  });
});

describe('parseJudgeVerdict', () => {
  it('maps the nested per-criterion verdicts and reasons', () => {
    const v = parseJudgeVerdict(
      '{"description":{"reason":"names the cafe","verdict":"pass"},"uncertainty":{"reason":"type is clear","verdict":"fail"}}',
    );
    assert.equal(v.description.pass, true);
    assert.equal(v.description.reason, 'names the cafe');
    assert.equal(v.uncertainty.pass, false);
    assert.equal(v.uncertainty.reason, 'type is clear');
  });

  it('strips a ```json code fence before parsing', () => {
    const v = parseJudgeVerdict(
      'Here is my grade:\n```json\n{"description":{"reason":"ok","verdict":"PASS"},"uncertainty":{"reason":"ok","verdict":"pass"}}\n```',
    );
    assert.equal(v.description.pass, true);
    assert.equal(v.uncertainty.pass, true);
  });

  it('throws on an unparseable reply', () => {
    assert.throws(() => parseJudgeVerdict('no json here'), /could not be parsed/);
  });

  it('throws (rather than silently failing) when a criterion is missing', () => {
    assert.throws(
      () => parseJudgeVerdict('{"description":{"reason":"ok","verdict":"pass"}}'),
      /missing the "uncertainty" criterion/,
    );
  });
});

describe('createLlmJudge', () => {
  it('reports availability from the model', () => {
    assert.equal(createLlmJudge({ chat: async () => '{}', model: '' }).isAvailable(), false);
    assert.equal(createLlmJudge({ chat: async () => '{}', model: 'x' }).isAvailable(), true);
  });

  it('drives the injected chat with the schema and parses the reply', async () => {
    let seenFormat: unknown;
    const chat: JudgeChatFn = async (_messages, format) => {
      seenFormat = format;
      return '{"description":{"reason":"ok","verdict":"pass"},"uncertainty":{"reason":"ok","verdict":"pass"}}';
    };
    const verdict = await createLlmJudge({ chat, model: 'judge-x' }).judge(INPUT);

    assert.equal(verdict.description.pass, true);
    assert.equal(verdict.uncertainty.pass, true);
    // The schema is nested by criterion, and each criterion orders reason before
    // verdict (chain-of-thought: reason first, then the pass/fail).
    const format = seenFormat as {
      required: string[];
      properties: { description: { required: string[] } };
    };
    assert.deepEqual(format.required, ['description', 'uncertainty']);
    assert.deepEqual(format.properties.description.required, ['reason', 'verdict']);
  });
});
