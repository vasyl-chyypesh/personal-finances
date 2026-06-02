import type { Category, Currency, ExchangeRates, LedgerEntry, LedgerEntryType } from '../types.ts';
import { convert } from './currency.ts';

export interface PivotCell {
  amount: number;
  /** Descriptions of the entries summed into this cell (for tooltip + indicator). */
  notes: string[];
}

export interface PivotRow {
  category: Category;
  /** One cell per day of the month; index 0 === day 1. */
  cells: PivotCell[];
  total: number;
}

export interface PivotSection {
  rows: PivotRow[];
  dailyTotals: number[];
  grandTotal: number;
}

export interface PivotResult {
  daysInMonth: number;
  expense: PivotSection;
  income: PivotSection;
}

function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

/**
 * Pivots flat ledger entries into a category × day matrix per type. Amounts are
 * converted into `displayCurrency` via the rate matrix. Rows include only
 * categories that have at least one entry of that type, sorted by `nameOf`.
 */
export function pivot(
  entries: LedgerEntry[],
  displayCurrency: Currency,
  daysInMonth: number,
  rates: ExchangeRates,
  nameOf: (category: Category) => string,
): PivotResult {
  const sections: Record<LedgerEntryType, Map<number, PivotRow>> = {
    expense: new Map(),
    income: new Map(),
  };

  for (const entry of entries) {
    const day = dayOfMonth(entry.date);
    if (day < 1 || day > daysInMonth) {
      continue;
    }
    const rows = sections[entry.type];
    let row = rows.get(entry.category.id);
    if (!row) {
      row = {
        category: entry.category,
        cells: Array.from({ length: daysInMonth }, () => ({ amount: 0, notes: [] })),
        total: 0,
      };
      rows.set(entry.category.id, row);
    }
    const value = convert(entry.amount, entry.currency, displayCurrency, rates);
    const cell = row.cells[day - 1];
    cell.amount += value;
    row.total += value;
    if (entry.description) {
      cell.notes.push(entry.description);
    }
  }

  const buildSection = (rows: Map<number, PivotRow>): PivotSection => {
    const ordered = [...rows.values()].sort((a, b) =>
      nameOf(a.category).localeCompare(nameOf(b.category)),
    );
    const dailyTotals = Array<number>(daysInMonth).fill(0);
    let grandTotal = 0;
    for (const row of ordered) {
      grandTotal += row.total;
      for (let d = 0; d < daysInMonth; d += 1) {
        // eslint-disable-next-line security/detect-object-injection -- d is a bounded loop index
        dailyTotals[d] += row.cells[d].amount;
      }
    }
    return { rows: ordered, dailyTotals, grandTotal };
  };

  return {
    daysInMonth,
    expense: buildSection(sections.expense),
    income: buildSection(sections.income),
  };
}
