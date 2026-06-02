import type Database from 'better-sqlite3';
import type { ICategoriesRepository } from '../api/categories/categories.repository.js';
import type { ILedgerRepository } from '../api/ledger/ledger.repository.js';
import type { Currency } from '../api/ledger/ledger.types.js';
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

  import(sheet: ParsedSheet): ImportSummary {
    const { month, year, rows } = sheet;
    const monthStr = `${year}-${pad2(month)}`;
    const startDate = `${monthStr}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${monthStr}-${pad2(lastDay)}`;

    let categoriesCreated = 0;
    let entriesDeleted = 0;
    let entriesInserted = 0;

    const categoryIds = new Map<string, number>();
    const resolveCategory = (name: string): number => {
      const cached = categoryIds.get(name);
      if (cached !== undefined) return cached;
      let category = this.categoriesRepo.findByName(name);
      if (!category) {
        category = this.categoriesRepo.create(name);
        categoriesCreated++;
      }
      categoryIds.set(name, category.id);
      return category.id;
    };

    const runImport = this.db.transaction(() => {
      // Wipe the month first so re-running the same file is idempotent.
      entriesDeleted = this.ledgerRepo.deleteByDateRange(startDate, endDate);

      for (const row of rows) {
        this.ledgerRepo.create({
          type: row.type,
          amount: row.amount,
          currency: IMPORT_CURRENCY,
          categoryId: resolveCategory(row.category),
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
