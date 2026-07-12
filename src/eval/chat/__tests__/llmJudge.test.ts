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
  it('includes the message, both descriptions and the flagged fields', () => {
    const [system, user] = buildJudgeMessages(INPUT);
    assert.equal(system.role, 'system');
    assert.equal(user.role, 'user');
    assert.match(user.content, /coffee at Aroma Kava for 85/);
    assert.match(user.content, /Expected description: Aroma Kava/);
    assert.match(user.content, /\[type\]/);
  });

  it('renders "(none)" for an absent description and "[] (none)" for no flags', () => {
    const [, user] = buildJudgeMessages({
      ...INPUT,
      actualDescription: null,
      flaggedByModel: [],
    });
    assert.match(user.content, /Assistant description: \(none\)/);
    assert.match(user.content, /flagged as uncertain: \[\] \(none\)/);
  });
});

describe('parseJudgeVerdict', () => {
  it('maps pass/fail verdicts and reasons', () => {
    const v = parseJudgeVerdict(
      '{"descriptionVerdict":"pass","descriptionReason":"names the cafe","uncertaintyVerdict":"fail","uncertaintyReason":"type is clear"}',
    );
    assert.equal(v.description.pass, true);
    assert.equal(v.description.reason, 'names the cafe');
    assert.equal(v.uncertainty.pass, false);
    assert.equal(v.uncertainty.reason, 'type is clear');
  });

  it('strips a ```json code fence before parsing', () => {
    const v = parseJudgeVerdict(
      'Here is my grade:\n```json\n{"descriptionVerdict":"PASS","descriptionReason":"ok","uncertaintyVerdict":"pass","uncertaintyReason":"ok"}\n```',
    );
    assert.equal(v.description.pass, true);
    assert.equal(v.uncertainty.pass, true);
  });

  it('throws on an unparseable reply', () => {
    assert.throws(() => parseJudgeVerdict('no json here'), /could not be parsed/);
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
      return '{"descriptionVerdict":"pass","descriptionReason":"ok","uncertaintyVerdict":"pass","uncertaintyReason":"ok"}';
    };
    const verdict = await createLlmJudge({ chat, model: 'judge-x' }).judge(INPUT);

    assert.equal(verdict.description.pass, true);
    assert.equal(verdict.uncertainty.pass, true);
    // The schema constrains the reply and orders each reason before its verdict
    // (chain-of-thought: reason first, then the pass/fail).
    assert.deepEqual((seenFormat as { required: string[] }).required, [
      'descriptionReason',
      'descriptionVerdict',
      'uncertaintyReason',
      'uncertaintyVerdict',
    ]);
  });
});
