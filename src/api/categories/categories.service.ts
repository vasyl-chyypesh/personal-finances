import { HttpError } from '../shared/errors/httpError.js';
import { CODES } from '../shared/errors/codes.js';
import { MESSAGES } from '../shared/errors/messages.js';
import { slugify } from './categories.catalog.js';
import type { ICategoriesRepository } from './categories.repository.js';
import type { Category, LocalizedName } from './categories.types.js';

export class CategoriesService {
  constructor(private readonly repository: ICategoriesRepository) {}

  list(includeDeleted = false): Category[] {
    return this.repository.findAll(includeDeleted);
  }

  /** Creates a category with a slug auto-derived from its name. */
  create(names: LocalizedName): Category {
    const slug = slugify(names.en ?? names.uk ?? '');
    if (!slug) {
      throw new HttpError(MESSAGES.CATEGORY_INVALID_NAME, CODES.CATEGORY_INVALID_NAME, 400);
    }
    if (this.repository.findBySlug(slug)) {
      throw new HttpError(MESSAGES.CATEGORY_SLUG_CONFLICT, CODES.CATEGORY_SLUG_CONFLICT, 409);
    }
    return this.repository.create(slug, names);
  }

  /** Merges the given translations into the category's existing names. */
  updateNames(id: number, names: LocalizedName): Category {
    this.requireExisting(id);
    const existing = this.repository.findById(id)!;
    const merged: LocalizedName = { ...existing.names, ...names };
    return this.repository.updateNames(id, merged);
  }

  remove(id: number): Category {
    this.requireExisting(id);
    return this.repository.softDelete(id, new Date().toISOString());
  }

  restore(id: number): Category {
    this.requireExisting(id);
    return this.repository.restore(id);
  }

  /** Persists a new ordering; `ids` is the full ordered list of category ids. */
  reorder(ids: number[]): void {
    this.repository.reorder(ids);
  }

  private requireExisting(id: number): void {
    if (!this.repository.findById(id)) {
      throw new HttpError(MESSAGES.CATEGORY_NOT_FOUND, CODES.CATEGORY_NOT_FOUND, 404);
    }
  }
}
