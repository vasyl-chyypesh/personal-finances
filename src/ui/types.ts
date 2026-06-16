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
  /** ISO date the served matrix was sourced for. */
  asOf: string;
  /** True when the served rates are older than the freshness threshold. */
  stale: boolean;
  rates: ExchangeRates;
}

/** Quote currencies charted against the base (USD/EUR). */
export type QuoteCurrency = Exclude<Currency, 'UAH'>;
export const QUOTE_CURRENCIES: QuoteCurrency[] = ['USD', 'EUR'];

export interface RateHistoryPoint {
  date: string;
  /** `rates[quote]` = how many base units 1 unit of `quote` is worth. */
  rates: Record<QuoteCurrency, number>;
}

export interface RateHistoryResponse {
  base: Currency;
  /** Effective (clamped) range covered by the series. */
  from: string;
  to: string;
  series: RateHistoryPoint[];
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

// --- AI chat (draft ledger entries from natural language) ---

export type UncertainField = 'type' | 'amount' | 'currency' | 'category' | 'date';

/** A draft entry extracted from a chat message; `categoryId` may be unresolved. */
export interface DraftLedgerEntry {
  type: LedgerEntryType;
  /** Integer minor units (cents). */
  amount: number;
  currency: Currency;
  categoryId: number | null;
  description?: string;
  date: string;
}

export interface ChatExtractResult {
  draft: DraftLedgerEntry;
  /** Fields the user should double-check (defaulted or low-confidence). */
  uncertainFields: UncertainField[];
  /** True when no category resolved — the user must pick one before saving. */
  unresolvedCategory: boolean;
}

export interface ChatStatus {
  /** Whether the feature is configured (a model is set up). */
  available: boolean;
  /** Whether the model file is already downloaded (no wait on first use). */
  ready: boolean;
}

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
