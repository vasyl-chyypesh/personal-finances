// Browser-side mirror of the API domain types. Kept separate from the server
// modules in src/api so the UI never imports better-sqlite3-backed code.

export type LedgerEntryType = 'income' | 'expense';
export type Currency = 'UAH' | 'USD' | 'EUR';
export type Period = 'week' | 'month' | 'year';

export interface Category {
  id: number;
  name: string;
}

export interface LedgerEntry {
  id: number;
  type: LedgerEntryType;
  amount: number;
  currency: Currency;
  category: Category;
  description?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLedgerEntryDto {
  type: LedgerEntryType;
  amount: number;
  currency: Currency;
  categoryId: number;
  description?: string;
  date: string;
}

export type UpdateLedgerEntryDto = Partial<CreateLedgerEntryDto>;

export interface LedgerListResult {
  records: LedgerEntry[];
  period: Period;
  startDate: string;
  endDate: string;
}

export const LEDGER_TYPES: LedgerEntryType[] = ['income', 'expense'];
export const CURRENCIES: Currency[] = ['UAH', 'USD', 'EUR'];
export const PERIODS: Period[] = ['week', 'month', 'year'];
