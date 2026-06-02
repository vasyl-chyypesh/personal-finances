import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LedgerService } from '../ledger.service.js';
import type { ILedgerRepository } from '../ledger.repository.js';
import type { ICategoriesRepository } from '../../categories/categories.repository.js';
import type { LedgerEntry, CreateLedgerEntryDto } from '../ledger.types.js';

function makeMockLedgerRepo(overrides: Partial<ILedgerRepository> = {}): ILedgerRepository {
  return {
    create: () => {
      throw new Error('not implemented');
    },
    findById: () => undefined,
    findByDateRange: () => [],
    update: () => {
      throw new Error('not implemented');
    },
    deleteById: () => false,
    deleteByDateRange: () => 0,
    ...overrides,
  };
}

function makeMockCategoriesRepo(
  overrides: Partial<ICategoriesRepository> = {},
): ICategoriesRepository {
  return {
    findAll: () => [],
    findById: () => undefined,
    findBySlug: () => undefined,
    create: () => {
      throw new Error('not implemented');
    },
    updateNames: () => {
      throw new Error('not implemented');
    },
    ...overrides,
  };
}

const stubCategory = {
  id: 1,
  slug: 'grocery',
  names: { en: 'Groceries', uk: 'Продукти харчування' },
};
const stubEntry: LedgerEntry = {
  id: 1,
  type: 'expense',
  amount: 100,
  currency: 'UAH',
  category: stubCategory,
  date: '2026-06-01',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('LedgerService (unit)', () => {
  it('create throws 400 when categoryId does not exist', () => {
    const service = new LedgerService(
      makeMockLedgerRepo(),
      makeMockCategoriesRepo({ findById: () => undefined }),
    );
    const dto: CreateLedgerEntryDto = {
      type: 'expense',
      amount: 50,
      currency: 'UAH',
      categoryId: 99,
      date: '2026-06-01',
    };
    assert.throws(
      () => service.create(dto),
      (err: Error) => {
        assert.ok(err.message.includes('categoryId'));
        return true;
      },
    );
  });

  it('create delegates to repo when category is valid', () => {
    let called = false;
    const service = new LedgerService(
      makeMockLedgerRepo({
        create: () => {
          called = true;
          return stubEntry;
        },
      }),
      makeMockCategoriesRepo({ findById: () => stubCategory }),
    );
    const result = service.create({
      type: 'expense',
      amount: 50,
      currency: 'UAH',
      categoryId: 1,
      date: '2026-06-01',
    });
    assert.ok(called);
    assert.deepEqual(result, stubEntry);
  });

  it('update throws 404 when entry does not exist', () => {
    const service = new LedgerService(
      makeMockLedgerRepo({ findById: () => undefined }),
      makeMockCategoriesRepo(),
    );
    assert.throws(
      () => service.update(99, { amount: 10 }),
      (err: Error) => {
        assert.ok(err.message.toLowerCase().includes('not found'));
        return true;
      },
    );
  });

  it('update throws 400 when new categoryId does not exist', () => {
    const service = new LedgerService(
      makeMockLedgerRepo({ findById: () => stubEntry }),
      makeMockCategoriesRepo({ findById: () => undefined }),
    );
    assert.throws(
      () => service.update(1, { categoryId: 99 }),
      (err: Error) => {
        assert.ok(err.message.includes('categoryId'));
        return true;
      },
    );
  });

  it('remove throws 404 when entry does not exist', () => {
    const service = new LedgerService(
      makeMockLedgerRepo({ findById: () => undefined }),
      makeMockCategoriesRepo(),
    );
    assert.throws(() => service.remove(99));
  });

  it('list computes week date range covering Monday to Sunday', () => {
    let startCapture = '';
    let endCapture = '';
    const service = new LedgerService(
      makeMockLedgerRepo({
        findByDateRange: (start, end) => {
          startCapture = start;
          endCapture = end;
          return [];
        },
      }),
      makeMockCategoriesRepo(),
    );
    const result = service.list('week');
    assert.equal(result.period, 'week');
    assert.ok(result.startDate <= result.endDate);
    const start = new Date(result.startDate);
    assert.equal(start.getUTCDay(), 1, 'startDate should be Monday');
    const end = new Date(result.endDate);
    assert.equal(end.getUTCDay(), 0, 'endDate should be Sunday');
    assert.equal(startCapture, result.startDate);
    assert.equal(endCapture, result.endDate);
  });

  it('list computes month date range covering 1st to last day', () => {
    const service = new LedgerService(
      makeMockLedgerRepo({ findByDateRange: () => [] }),
      makeMockCategoriesRepo(),
    );
    const result = service.list('month');
    assert.equal(result.period, 'month');
    assert.ok(result.startDate.endsWith('-01'));
    const endDay = new Date(result.endDate).getUTCDate();
    assert.ok(endDay >= 28 && endDay <= 31);
  });

  it('list scopes to an explicit year/month when both are provided', () => {
    const service = new LedgerService(
      makeMockLedgerRepo({ findByDateRange: () => [] }),
      makeMockCategoriesRepo(),
    );
    const result = service.list('month', 2026, 4);
    assert.equal(result.startDate, '2026-04-01');
    assert.equal(result.endDate, '2026-04-30');
  });

  it('list computes year date range from Jan 1 to Dec 31', () => {
    const service = new LedgerService(
      makeMockLedgerRepo({ findByDateRange: () => [] }),
      makeMockCategoriesRepo(),
    );
    const result = service.list('year');
    const year = new Date().getFullYear();
    assert.equal(result.startDate, `${year}-01-01`);
    assert.equal(result.endDate, `${year}-12-31`);
  });
});
