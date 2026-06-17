import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseExtraction } from '../chat.llm.js';
import type { HttpError } from '../../shared/errors/httpError.js';

const OBJECT =
  '{"type":"expense","amountMajor":500,"currency":null,"categorySlug":"grocery","description":null,"date":null,"uncertainFields":[]}';

describe('parseExtraction', () => {
  it('parses a bare JSON object', () => {
    assert.equal(parseExtraction(OBJECT).amountMajor, 500);
  });

  it('strips a ```json code fence (MLX-style output)', () => {
    const fenced = '```json\n' + OBJECT + '\n```';
    assert.equal(parseExtraction(fenced).categorySlug, 'grocery');
  });

  it('strips a plain ``` fence', () => {
    const fenced = '```\n' + OBJECT + '\n```';
    assert.equal(parseExtraction(fenced).type, 'expense');
  });

  it('extracts the object when surrounded by prose', () => {
    const prose = `Here is the ledger entry:\n${OBJECT}\nLet me know if that's right.`;
    assert.equal(parseExtraction(prose).amountMajor, 500);
  });

  it('tolerates surrounding whitespace', () => {
    assert.equal(parseExtraction(`\n\n  ${OBJECT}  \n`).currency, null);
  });

  it('throws CHAT_BAD_RESPONSE (502) when the reply is not JSON', () => {
    assert.throws(
      () => parseExtraction('I cannot help with that.'),
      (err: HttpError) => {
        assert.equal(err.httpStatus, 502);
        assert.equal(err.code, 'CHAT_BAD_RESPONSE');
        return true;
      },
    );
  });
});
