import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pivot } from '../lib/pivot.ts';
import type { Category, ExchangeRates, LedgerEntry } from '../../../types.ts';

const RATES: ExchangeRates = {
  UAH: { UAH: 1, USD: 1 / 44, EUR: 1 / 52 },
  USD: { UAH: 44, USD: 1, EUR: 1 / 1.16 },
  EUR: { UAH: 52, USD: 1.16, EUR: 1 },
};

const grocery: Category = {
  id: 1,
  slug: 'grocery',
  names: { en: 'Groceries', uk: 'Продукти' },
  sortOrder: 2,
};
const transport: Category = {
  id: 2,
  slug: 'transport',
  names: { en: 'Transport', uk: 'Транспорт' },
  sortOrder: 0,
};
const salary: Category = {
  id: 3,
  slug: 'salary',
  names: { en: 'Salary', uk: 'Зарплата' },
  sortOrder: 1,
};

function entry(over: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: Math.random(),
    type: 'expense',
    amount: 100,
    currency: 'UAH',
    category: grocery,
    date: '2026-04-10',
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}

describe('pivot', () => {
  it('buckets entries into category × day cells and sums per row', () => {
    const result = pivot(
      [
        entry({ category: grocery, amount: 100, date: '2026-04-10' }),
        entry({ category: grocery, amount: 50, date: '2026-04-10' }),
        entry({ category: grocery, amount: 25, date: '2026-04-12' }),
      ],
      'UAH',
      30,
      RATES,
    );
    const row = result.expense.rows[0];
    assert.equal(row.category.id, grocery.id);
    assert.equal(row.cells[9].amount, 150); // day 10
    assert.equal(row.cells[11].amount, 25); // day 12
    assert.equal(row.total, 175);
    assert.equal(result.expense.dailyTotals[9], 150);
    assert.equal(result.expense.grandTotal, 175);
  });

  it('converts amounts into the display currency via the rate matrix', () => {
    const result = pivot(
      [entry({ amount: 100, currency: 'USD', date: '2026-04-01' })],
      'UAH',
      30,
      RATES,
    );
    assert.equal(result.expense.rows[0].cells[0].amount, 4400); // 100 USD * 44
  });

  it('separates expense and income sections', () => {
    const result = pivot(
      [
        entry({ type: 'expense', category: grocery, amount: 200 }),
        entry({ type: 'income', category: salary, amount: 5000 }),
      ],
      'UAH',
      30,
      RATES,
    );
    assert.equal(result.expense.grandTotal, 200);
    assert.equal(result.income.grandTotal, 5000);
    assert.equal(result.income.rows[0].category.id, salary.id);
  });

  it('orders rows by category sortOrder and collects per-cell notes', () => {
    const result = pivot(
      [
        entry({ category: grocery, amount: 10 }),
        entry({ category: transport, amount: 10, description: 'taxi' }),
      ],
      'UAH',
      30,
      RATES,
    );
    // transport (sortOrder 0) sorts before grocery (sortOrder 2)
    assert.deepEqual(
      result.expense.rows.map((r) => r.category.slug),
      ['transport', 'grocery'],
    );
    assert.deepEqual(result.expense.rows[0].cells[9].notes, ['taxi']);
  });

  it('returns zeroed sections when there are no entries', () => {
    const result = pivot([], 'UAH', 31, RATES);
    assert.equal(result.expense.rows.length, 0);
    assert.equal(result.expense.grandTotal, 0);
    assert.equal(result.expense.dailyTotals.length, 31);
    assert.ok(result.expense.dailyTotals.every((v) => v === 0));
  });
});
