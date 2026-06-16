import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatService } from '../chat.service.js';
import type { ICategoriesRepository } from '../../categories/categories.repository.js';
import type { Category } from '../../categories/categories.types.js';
import type { HttpError } from '../../shared/errors/httpError.js';
import type { ExtractContext, ILedgerExtractor, RawExtraction } from '../chat.types.js';

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

const CATEGORIES: Category[] = [
  { id: 1, slug: 'grocery', names: { en: 'Groceries', uk: 'Продукти' } },
  { id: 2, slug: 'taxi', names: { en: 'Taxi', uk: 'Таксі' } },
];

/** Mock repo — only `findAll` is used by the service. */
function mockCategoriesRepo(categories: Category[] = CATEGORIES): ICategoriesRepository {
  const notUsed = () => {
    throw new Error('not used in chat tests');
  };
  return {
    findAll: () => categories,
    findById: notUsed,
    findBySlug: notUsed,
    create: notUsed,
    updateNames: notUsed,
    softDelete: notUsed,
    restore: notUsed,
    reorder: notUsed,
  };
}

/** Extractor stub that returns a scripted raw extraction. */
function fakeExtractor(
  raw: RawExtraction,
  opts: { available?: boolean; ready?: boolean; capture?: (ctx: ExtractContext) => void } = {},
): ILedgerExtractor {
  return {
    isAvailable: () => opts.available ?? true,
    isReady: () => opts.ready ?? false,
    extract: (_message, ctx) => {
      opts.capture?.(ctx);
      return Promise.resolve(raw);
    },
  };
}

const FULL: RawExtraction = {
  type: 'expense',
  amountMajor: 12.5,
  currency: 'UAH',
  categorySlug: 'grocery',
  description: '  weekly shop  ',
  date: '2026-06-01',
  uncertainFields: [],
};

// ---------------------------------------------------------------------------
// ChatService unit tests
// ---------------------------------------------------------------------------

describe('ChatService', () => {
  it('resolves a fully-specified message into a clean draft', async () => {
    const service = new ChatService(fakeExtractor(FULL), mockCategoriesRepo());
    const { draft, uncertainFields, unresolvedCategory } = await service.extract('...');

    assert.deepEqual(draft, {
      type: 'expense',
      amount: 1250, // 12.50 -> cents
      currency: 'UAH',
      categoryId: 1,
      description: 'weekly shop', // trimmed
      date: '2026-06-01',
    });
    assert.equal(unresolvedCategory, false);
    assert.deepEqual(uncertainFields, []);
  });

  it('applies defaults for null type/currency/date and flags them uncertain', async () => {
    const raw: RawExtraction = {
      ...FULL,
      type: null,
      currency: null,
      date: null,
      uncertainFields: [],
    };
    const service = new ChatService(fakeExtractor(raw), mockCategoriesRepo());
    const { draft, uncertainFields } = await service.extract('...');

    assert.equal(draft.type, 'expense');
    assert.equal(draft.currency, 'UAH');
    assert.match(draft.date, /^\d{4}-\d{2}-\d{2}$/); // defaulted to today
    for (const f of ['type', 'currency', 'date']) {
      assert.ok(uncertainFields.includes(f as never), `${f} should be uncertain`);
    }
  });

  it('treats a malformed model date as missing and defaults to today', async () => {
    const raw: RawExtraction = { ...FULL, date: '2026-02-30' }; // impossible calendar date
    const service = new ChatService(fakeExtractor(raw), mockCategoriesRepo());
    const { draft, uncertainFields } = await service.extract('...');

    assert.notEqual(draft.date, '2026-02-30');
    assert.match(draft.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(uncertainFields.includes('date'));
  });

  it('leaves amount 0 and flags it when the model gives no amount', async () => {
    const raw: RawExtraction = { ...FULL, amountMajor: null };
    const service = new ChatService(fakeExtractor(raw), mockCategoriesRepo());
    const { draft, uncertainFields } = await service.extract('...');

    assert.equal(draft.amount, 0);
    assert.ok(uncertainFields.includes('amount'));
  });

  it('blocks save with unresolvedCategory when the slug is unknown', async () => {
    const raw: RawExtraction = { ...FULL, categorySlug: 'not-a-real-slug' };
    const service = new ChatService(fakeExtractor(raw), mockCategoriesRepo());
    const { draft, unresolvedCategory, uncertainFields } = await service.extract('...');

    assert.equal(draft.categoryId, null);
    assert.equal(unresolvedCategory, true);
    assert.ok(uncertainFields.includes('category'));
  });

  it('blocks save when the model returns a null category', async () => {
    const raw: RawExtraction = { ...FULL, categorySlug: null };
    const service = new ChatService(fakeExtractor(raw), mockCategoriesRepo());
    const { draft, unresolvedCategory } = await service.extract('...');

    assert.equal(draft.categoryId, null);
    assert.equal(unresolvedCategory, true);
  });

  it('merges model-reported uncertain fields with defaulted ones', async () => {
    const raw: RawExtraction = { ...FULL, currency: null, uncertainFields: ['category'] };
    const service = new ChatService(fakeExtractor(raw), mockCategoriesRepo());
    const { uncertainFields } = await service.extract('...');

    assert.ok(uncertainFields.includes('currency')); // defaulted
    assert.ok(uncertainFields.includes('category')); // model-reported
  });

  it('passes today and the category catalog to the extractor', async () => {
    let seen: ExtractContext | undefined;
    const service = new ChatService(
      fakeExtractor(FULL, { capture: (ctx) => (seen = ctx) }),
      mockCategoriesRepo(),
    );
    await service.extract('...');

    assert.match(seen!.today, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(
      seen!.categories.map((c) => c.slug),
      ['grocery', 'taxi'],
    );
  });

  it('reports availability/readiness from the extractor', () => {
    const service = new ChatService(
      fakeExtractor(FULL, { available: true, ready: false }),
      mockCategoriesRepo(),
    );
    assert.deepEqual(service.status(), { available: true, ready: false });
  });

  it('throws 503 CHAT_UNAVAILABLE when the extractor is unavailable', async () => {
    const service = new ChatService(
      fakeExtractor(FULL, { available: false }),
      mockCategoriesRepo(),
    );
    await assert.rejects(
      () => service.extract('...'),
      (err: HttpError) => {
        assert.equal(err.httpStatus, 503);
        assert.equal(err.code, 'CHAT_UNAVAILABLE');
        return true;
      },
    );
  });
});
