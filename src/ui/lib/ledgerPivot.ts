import { convertCents } from './currencyMeta.ts';
import type { Category, Currency, ExchangeRates, LedgerEntry, LedgerEntryType } from '../types.ts';

export interface PivotRow {
  category: Category;
  /** Base-currency cents per day; index 0 = day 1. Zero when no entries. */
  cells: number[];
  /** True where any entry that day carries a description. */
  notes: boolean[];
  total: number;
}

export interface PivotSection {
  type: LedgerEntryType;
  rows: PivotRow[];
  /** Per-day column totals; index 0 = day 1. */
  dayTotals: number[];
  total: number;
}

export interface Pivot {
  daysInMonth: number;
  /** Always [expense, income] so callers can pick by type. */
  sections: PivotSection[];
}

/** Days in a given 1-based month, computed in UTC. */
export function daysInMonthUTC(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export interface BuildPivotOptions {
  year: number;
  /** 1-based month (1 = January). */
  month: number;
  base: Currency;
  rates: ExchangeRates | null;
}

/**
 * Pivots ledger records into a category × day-of-month grid, split by type.
 * Every amount is converted to the base currency in integer cents so a cell can
 * safely aggregate entries in different currencies. Records outside the month
 * are ignored. Rows include only categories with activity that month, ordered
 * by the category sort order (then id).
 */
export function buildPivot(records: LedgerEntry[], opts: BuildPivotOptions): Pivot {
  const { year, month, base, rates } = opts;
  const days = daysInMonthUTC(year, month);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  const buildSection = (type: LedgerEntryType): PivotSection => {
    const rowsById = new Map<number, PivotRow>();
    const dayTotals = new Array<number>(days).fill(0);
    let total = 0;

    for (const r of records) {
      if (r.type !== type || !r.date.startsWith(prefix)) continue;
      const day = Number(r.date.slice(8, 10));
      if (!Number.isInteger(day) || day < 1 || day > days) continue;
      const idx = day - 1;
      const cents = rates ? convertCents(r.amount, r.currency, base, rates) : r.amount;

      let row = rowsById.get(r.category.id);
      if (!row) {
        row = {
          category: r.category,
          cells: new Array<number>(days).fill(0),
          notes: new Array<boolean>(days).fill(false),
          total: 0,
        };
        rowsById.set(r.category.id, row);
      }
      /* eslint-disable security/detect-object-injection -- idx is a bounded day index (0..days-1) */
      row.cells[idx] += cents;
      if (r.description?.trim()) row.notes[idx] = true;
      row.total += cents;
      dayTotals[idx] += cents;
      /* eslint-enable security/detect-object-injection */
      total += cents;
    }

    const rows = [...rowsById.values()].sort(
      (a, b) =>
        (a.category.sortOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.category.sortOrder ?? Number.MAX_SAFE_INTEGER) || a.category.id - b.category.id,
    );

    return { type, rows, dayTotals, total };
  };

  return { daysInMonth: days, sections: [buildSection('expense'), buildSection('income')] };
}
