import type Database from 'better-sqlite3';
import type { LedgerEntry, CreateLedgerEntryDto, UpdateLedgerEntryDto } from './ledger.types.js';

interface LedgerRow {
  id: number;
  type: string;
  amount: number;
  currency: string;
  category_id: number;
  category_name: string;
  description: string | null;
  date: string;
  created_at: string;
  updated_at: string;
}

function mapRow(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    type: row.type as LedgerEntry['type'],
    amount: row.amount,
    currency: row.currency as LedgerEntry['currency'],
    category: { id: row.category_id, name: row.category_name },
    description: row.description ?? undefined,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_WITH_CATEGORY = `
  SELECT
    le.id,
    le.type,
    le.amount,
    le.currency,
    le.category_id,
    c.name  AS category_name,
    le.description,
    le.date,
    le.created_at,
    le.updated_at
  FROM ledger_entries le
  JOIN categories c ON c.id = le.category_id
`;

export interface ILedgerRepository {
  create(dto: CreateLedgerEntryDto): LedgerEntry;
  findById(id: number): LedgerEntry | undefined;
  findByDateRange(startDate: string, endDate: string): LedgerEntry[];
  update(id: number, dto: UpdateLedgerEntryDto): LedgerEntry;
  deleteById(id: number): boolean;
}

export class LedgerRepository implements ILedgerRepository {
  constructor(private readonly db: Database.Database) {}

  create(dto: CreateLedgerEntryDto): LedgerEntry {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `INSERT INTO ledger_entries (type, amount, currency, category_id, description, date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        dto.type,
        dto.amount,
        dto.currency,
        dto.categoryId,
        dto.description ?? null,
        dto.date,
        now,
        now,
      );

    return this.findById(Number(result.lastInsertRowid))!;
  }

  findById(id: number): LedgerEntry | undefined {
    const row = this.db.prepare(`${SELECT_WITH_CATEGORY} WHERE le.id = ?`).get(id) as
      | LedgerRow
      | undefined;
    return row ? mapRow(row) : undefined;
  }

  findByDateRange(startDate: string, endDate: string): LedgerEntry[] {
    const rows = this.db
      .prepare(
        `${SELECT_WITH_CATEGORY} WHERE le.date >= ? AND le.date <= ? ORDER BY le.date DESC, le.id DESC`,
      )
      .all(startDate, endDate) as LedgerRow[];
    return rows.map(mapRow);
  }

  update(id: number, dto: UpdateLedgerEntryDto): LedgerEntry {
    const now = new Date().toISOString();
    const fields: string[] = ['updated_at = ?'];
    const values: (string | number | null)[] = [now];

    if (dto.type !== undefined) {
      fields.push('type = ?');
      values.push(dto.type);
    }
    if (dto.amount !== undefined) {
      fields.push('amount = ?');
      values.push(dto.amount);
    }
    if (dto.currency !== undefined) {
      fields.push('currency = ?');
      values.push(dto.currency);
    }
    if (dto.categoryId !== undefined) {
      fields.push('category_id = ?');
      values.push(dto.categoryId);
    }
    if (dto.description !== undefined) {
      fields.push('description = ?');
      values.push(dto.description);
    }
    if (dto.date !== undefined) {
      fields.push('date = ?');
      values.push(dto.date);
    }

    values.push(id);

    this.db.prepare(`UPDATE ledger_entries SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    return this.findById(id)!;
  }

  deleteById(id: number): boolean {
    const result = this.db.prepare('DELETE FROM ledger_entries WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
