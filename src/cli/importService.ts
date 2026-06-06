import type Database from 'better-sqlite3';
import type { ICategoriesRepository } from '../api/categories/categories.repository.js';
import type { ILedgerRepository } from '../api/ledger/ledger.repository.js';
import type { Currency } from '../api/ledger/ledger.types.js';
import type { Locale } from '../api/categories/categories.types.js';
import { resolveCategory } from '../api/categories/categories.catalog.js';
import type { ParsedSheet } from './xlsParser.js';

const IMPORT_CURRENCY: Currency = 'UAH';

export interface ImportSummary {
  /** YYYY-MM */
  month: string;
  categoriesCreated: number;
  entriesDeleted: number;
  entriesInserted: number;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export class ImportService {
  constructor(
    private readonly db: Database.Database,
    private readonly ledgerRepo: ILedgerRepository,
    private readonly categoriesRepo: ICategoriesRepository,
  ) {}

  import(sheet: ParsedSheet, locale: Locale = 'uk'): ImportSummary {
    const { month, year, rows } = sheet;
    const monthStr = `${year}-${pad2(month)}`;
    const startDate = `${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${monthStr}-${pad2(lastDay)}`;

    let categoriesCreated = 0;
    let entriesDeleted = 0;
    let entriesInserted = 0;

    // Resolve a label to a category id, mapping known labels onto catalog slugs
    // (bilingual) and creating a single-locale category for unknown ones.
    const categoryIds = new Map<string, number>();
    const resolveCategoryId = (label: string): number => {
      const { slug, names } = resolveCategory(label, locale);
      const cached = categoryIds.get(slug);
      if (cached !== undefined) return cached;
      const existing = this.categoriesRepo.findBySlug(slug);
      const id = existing ? existing.id : this.categoriesRepo.create(slug, names).id;
      if (!existing) categoriesCreated++;
      categoryIds.set(slug, id);
      return id;
    };

    const runImport = this.db.transaction(() => {
      // Wipe the month first so re-running the same file is idempotent.
      entriesDeleted = this.ledgerRepo.deleteByDateRange(startDate, endDate);

      for (const row of rows) {
        this.ledgerRepo.create({
          type: row.type,
          // xls cells are decimal major units; store as integer minor units (cents).
          amount: Math.round(row.amount * 100),
          currency: IMPORT_CURRENCY,
          categoryId: resolveCategoryId(row.category),
          description: row.description ?? undefined,
          date: `${monthStr}-${pad2(row.day)}`,
        });
        entriesInserted++;
      }
    });

    runImport();

    return { month: monthStr, categoriesCreated, entriesDeleted, entriesInserted };
  }
}
