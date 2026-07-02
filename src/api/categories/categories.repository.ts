import type Database from 'better-sqlite3';
import type { Category, LocalizedName } from './categories.types.js';

interface CategoryRow {
  id: number;
  slug: string;
  names: string;
  deleted_at: string | null;
  sort_order: number;
}

function mapRow(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    names: JSON.parse(row.names) as LocalizedName,
    deletedAt: row.deleted_at,
    sortOrder: row.sort_order,
  };
}

export interface ICategoriesRepository {
  findAll(includeDeleted?: boolean): Category[];
  findById(id: number): Category | undefined;
  findBySlug(slug: string): Category | undefined;
  create(slug: string, names: LocalizedName): Category;
  updateNames(id: number, names: LocalizedName): Category;
  softDelete(id: number, deletedAt: string): Category;
  restore(id: number): Category;
  reorder(ids: number[]): void;
}

const SELECT_FIELDS = 'id, slug, names, deleted_at, sort_order';

export class CategoriesRepository implements ICategoriesRepository {
  constructor(private readonly db: Database.Database) {}

  findAll(includeDeleted = false): Category[] {
    const where = includeDeleted ? '' : ' WHERE deleted_at IS NULL';
    const rows = this.db
      .prepare(`SELECT ${SELECT_FIELDS} FROM categories${where} ORDER BY sort_order, slug`)
      .all() as CategoryRow[];
    return rows.map(mapRow);
  }

  findById(id: number): Category | undefined {
    const row = this.db.prepare(`SELECT ${SELECT_FIELDS} FROM categories WHERE id = ?`).get(id) as
      CategoryRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  findBySlug(slug: string): Category | undefined {
    const row = this.db
      .prepare(`SELECT ${SELECT_FIELDS} FROM categories WHERE slug = ?`)
      .get(slug) as CategoryRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  create(slug: string, names: LocalizedName): Category {
    const result = this.db
      .prepare(
        `INSERT INTO categories (slug, names, sort_order)
         VALUES (?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM categories))`,
      )
      .run(slug, JSON.stringify(names));
    return this.findById(Number(result.lastInsertRowid))!;
  }

  updateNames(id: number, names: LocalizedName): Category {
    this.db.prepare('UPDATE categories SET names = ? WHERE id = ?').run(JSON.stringify(names), id);
    return this.findById(id)!;
  }

  softDelete(id: number, deletedAt: string): Category {
    this.db.prepare('UPDATE categories SET deleted_at = ? WHERE id = ?').run(deletedAt, id);
    return this.findById(id)!;
  }

  restore(id: number): Category {
    this.db.prepare('UPDATE categories SET deleted_at = NULL WHERE id = ?').run(id);
    return this.findById(id)!;
  }

  reorder(ids: number[]): void {
    const update = this.db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
    this.db.transaction(() => {
      ids.forEach((id, index) => update.run(index, id));
    })();
  }
}
