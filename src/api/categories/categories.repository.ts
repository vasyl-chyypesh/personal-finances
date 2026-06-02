import type Database from 'better-sqlite3';
import type { Category } from './categories.types.js';

export interface ICategoriesRepository {
  findAll(): Category[];
  findById(id: number): Category | undefined;
  findByName(name: string): Category | undefined;
  create(name: string): Category;
}

export class CategoriesRepository implements ICategoriesRepository {
  constructor(private readonly db: Database.Database) {}

  findAll(): Category[] {
    return this.db.prepare('SELECT id, name FROM categories ORDER BY name').all() as Category[];
  }

  findById(id: number): Category | undefined {
    return this.db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id) as
      | Category
      | undefined;
  }

  findByName(name: string): Category | undefined {
    return this.db.prepare('SELECT id, name FROM categories WHERE name = ?').get(name) as
      | Category
      | undefined;
  }

  create(name: string): Category {
    const result = this.db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
    return { id: Number(result.lastInsertRowid), name };
  }
}
