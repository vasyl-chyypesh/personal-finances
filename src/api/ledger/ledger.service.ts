import { HttpError } from '../shared/errors/httpError.js';
import { CODES } from '../shared/errors/codes.js';
import { MESSAGES } from '../shared/errors/messages.js';
import type { ICategoriesRepository } from '../categories/categories.repository.js';
import type { ILedgerRepository } from './ledger.repository.js';
import type {
  LedgerEntry,
  CreateLedgerEntryDto,
  UpdateLedgerEntryDto,
  Period,
} from './ledger.types.js';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface LedgerListResult {
  records: LedgerEntry[];
  period: Period;
  startDate: string;
  endDate: string;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDateRange(period: Period): DateRange {
  const now = new Date();

  if (period === 'week') {
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { startDate: toISODate(monday), endDate: toISODate(sunday) };
  }

  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: toISODate(start), endDate: toISODate(end) };
  }

  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  return { startDate: toISODate(start), endDate: toISODate(end) };
}

export class LedgerService {
  constructor(
    private readonly ledgerRepo: ILedgerRepository,
    private readonly categoriesRepo: ICategoriesRepository,
  ) {}

  create(dto: CreateLedgerEntryDto): LedgerEntry {
    if (!this.categoriesRepo.findById(dto.categoryId)) {
      throw new HttpError('Invalid categoryId', CODES.BAD_REQUEST, 400);
    }
    return this.ledgerRepo.create(dto);
  }

  list(period: Period): LedgerListResult {
    const { startDate, endDate } = getDateRange(period);
    const records = this.ledgerRepo.findByDateRange(startDate, endDate);
    return { records, period, startDate, endDate };
  }

  update(id: number, dto: UpdateLedgerEntryDto): LedgerEntry {
    if (!this.ledgerRepo.findById(id)) {
      throw new HttpError(MESSAGES.LEDGER_NOT_FOUND, CODES.LEDGER_NOT_FOUND, 404);
    }
    if (dto.categoryId !== undefined && !this.categoriesRepo.findById(dto.categoryId)) {
      throw new HttpError('Invalid categoryId', CODES.BAD_REQUEST, 400);
    }
    return this.ledgerRepo.update(id, dto);
  }

  remove(id: number): void {
    if (!this.ledgerRepo.findById(id)) {
      throw new HttpError(MESSAGES.LEDGER_NOT_FOUND, CODES.LEDGER_NOT_FOUND, 404);
    }
    this.ledgerRepo.deleteById(id);
  }
}
