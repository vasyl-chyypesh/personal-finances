import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPivot, daysInMonthUTC } from '../ledgerPivot.ts';
import type { Category, ExchangeRates, LedgerEntry, LedgerEntryType } from '../../types.ts';

const RATES: ExchangeRates = {
  UAH: { UAH: 1, USD: 0.025, EUR: 0.02 },
  USD: { UAH: 40, USD: 1, EUR: 0.8 },
  EUR: { UAH: 50, USD: 1.25, EUR: 1 },
};

const cat = (id: number, slug: string, sortOrder?: number): Category => ({
  id,
  slug,
  names: { en: slug },
  ...(sortOrder !== undefined ? { sortOrder } : {}),
});

let seq = 0;
const entry = (
  type: LedgerEntryType,
  amount: number,
  currency: LedgerEntry['currency'],
  category: Category,
  date: string,
  description?: string,
): LedgerEntry => ({
  id: ++seq,
  type,
  amount,
  currency,
  category,
  date,
  createdAt: date,
  updatedAt: date,
  ...(description !== undefined ? { description } : {}),
});

const A = cat(1, 'a', 1);
const B = cat(2, 'b', 2);
const C = cat(3, 'c', 1);

test('daysInMonthUTC', () => {
  assert.equal(daysInMonthUTC(2026, 4), 30);
  assert.equal(daysInMonthUTC(2026, 2), 28);
  assert.equal(daysInMonthUTC(2024, 2), 29);
  assert.equal(daysInMonthUTC(2026, 1), 31);
});

test('buildPivot pivots by type, category and day in base currency', () => {
  const records = [
    entry('expense', 80000, 'UAH', A, '2026-04-02'),
    entry('expense', 1000, 'USD', A, '2026-04-02', 'card'), // 10.00 USD -> 400.00 UAH
    entry('expense', 50000, 'UAH', B, '2026-04-05'),
    entry('income', 100000, 'UAH', C, '2026-04-01'),
    entry('expense', 99999, 'UAH', A, '2026-03-15'), // different month, ignored
  ];

  const pivot = buildPivot(records, { year: 2026, month: 4, base: 'UAH', rates: RATES });
  assert.equal(pivot.daysInMonth, 30);

  const [expense, income] = pivot.sections;
  assert.equal(expense.type, 'expense');
  assert.equal(income.type, 'income');

  // Expense rows ordered by sortOrder then id: A (1), B (2).
  assert.deepEqual(
    expense.rows.map((r) => r.category.id),
    [1, 2],
  );

  const rowA = expense.rows[0];
  assert.equal(rowA.cells[1], 120000); // day 2: 80000 + 40000
  assert.equal(rowA.notes[1], true); // one entry had a description
  assert.equal(rowA.total, 120000);

  const rowB = expense.rows[1];
  assert.equal(rowB.cells[4], 50000); // day 5
  assert.equal(rowB.notes[4], false);

  assert.equal(expense.dayTotals[1], 120000);
  assert.equal(expense.dayTotals[4], 50000);
  assert.equal(expense.total, 170000);

  assert.equal(income.rows.length, 1);
  assert.equal(income.rows[0].cells[0], 100000); // day 1
  assert.equal(income.total, 100000);
});

test('buildPivot falls back to raw amounts when rates are null', () => {
  const records = [entry('expense', 8000, 'USD', A, '2026-04-03')];
  const pivot = buildPivot(records, { year: 2026, month: 4, base: 'UAH', rates: null });
  assert.equal(pivot.sections[0].rows[0].cells[2], 8000); // unconverted
});
