// Browser-side mirror of the API domain types. Kept separate from the server
// modules in src/api so the UI never imports better-sqlite3-backed code.

export type LedgerEntryType = 'income' | 'expense';
export type Currency = 'UAH' | 'USD' | 'EUR';
export type Period = 'week' | 'month' | 'year';
export type Locale = 'en' | 'uk';

export type LocalizedName = Partial<Record<Locale, string>>;

/** Pairwise conversion matrix: `rates[from][to]` converts an amount from→to. */
export type ExchangeRates = Record<Currency, Record<Currency, number>>;

export interface ExchangeRatesResponse {
  base: Currency;
  rates: ExchangeRates;
}

export interface Category {
  id: number;
  slug: string;
  names: LocalizedName;
  deletedAt?: string | null;
  sortOrder?: number;
}

export interface CreateCategoryDto {
  names: LocalizedName;
}

export interface LedgerEntry {
  id: number;
  type: LedgerEntryType;
  /** Integer minor units (cents). */
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
  /** Integer minor units (cents). */
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
  /** Total entries in the range, ignoring limit/offset. */
  total: number;
}

export const LEDGER_TYPES: LedgerEntryType[] = ['income', 'expense'];
export const CURRENCIES: Currency[] = ['UAH', 'USD', 'EUR'];
export const PERIODS: Period[] = ['week', 'month', 'year'];
export const LOCALES: Locale[] = ['en', 'uk'];
