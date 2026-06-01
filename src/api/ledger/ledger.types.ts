import type { Category } from '../categories/categories.types.js';

export type LedgerEntryType = 'income' | 'expense';
export type Currency = 'UAH' | 'USD' | 'EUR';
export type Period = 'week' | 'month' | 'year';

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

export interface UpdateLedgerEntryDto {
  type?: LedgerEntryType;
  amount?: number;
  currency?: Currency;
  categoryId?: number;
  description?: string;
  date?: string;
}
