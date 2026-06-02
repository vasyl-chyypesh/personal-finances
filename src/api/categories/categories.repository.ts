import type Database from 'better-sqlite3';
import type { Category, LocalizedName } from './categories.types.js';

interface CategoryRow {
  id: number;
  slug: string;
  names: string;
}

function mapRow(row: CategoryRow): Category {
  return { id: row.id, slug: row.slug, names: JSON.parse(row.names) as LocalizedName };
}

export interface ICategoriesRepository {
  findAll(): Category[];
  findById(id: number): Category | undefined;
  findBySlug(slug: string): Category | undefined;
  create(slug: string, names: LocalizedName): Category;
  updateNames(id: number, names: LocalizedName): Category;
}

export class CategoriesRepository implements ICategoriesRepository {
  constructor(private readonly db: Database.Database) {}

  findAll(): Category[] {
    const rows = this.db
      .prepare('SELECT id, slug, names FROM categories ORDER BY slug')
      .all() as CategoryRow[];
    return rows.map(mapRow);
  }

  findById(id: number): Category | undefined {
    const row = this.db.prepare('SELECT id, slug, names FROM categories WHERE id = ?').get(id) as
      | CategoryRow
      | undefined;
    return row ? mapRow(row) : undefined;
  }

  findBySlug(slug: string): Category | undefined {
    const row = this.db
      .prepare('SELECT id, slug, names FROM categories WHERE slug = ?')
      .get(slug) as CategoryRow | undefined;
    return row ? mapRow(row) : undefined;
  }

  create(slug: string, names: LocalizedName): Category {
    const result = this.db
      .prepare('INSERT INTO categories (slug, names) VALUES (?, ?)')
      .run(slug, JSON.stringify(names));
    return { id: Number(result.lastInsertRowid), slug, names };
  }

  updateNames(id: number, names: LocalizedName): Category {
    this.db.prepare('UPDATE categories SET names = ? WHERE id = ?').run(JSON.stringify(names), id);
    return this.findById(id)!;
  }
}
