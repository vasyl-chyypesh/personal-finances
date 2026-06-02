import { HttpError } from '../shared/errors/httpError.js';
import { CODES } from '../shared/errors/codes.js';
import { MESSAGES } from '../shared/errors/messages.js';
import type { ICategoriesRepository } from './categories.repository.js';
import type { Category, LocalizedName } from './categories.types.js';

export class CategoriesService {
  constructor(private readonly repository: ICategoriesRepository) {}

  list(): Category[] {
    return this.repository.findAll();
  }

  /** Merges the given translations into the category's existing names. */
  updateNames(id: number, names: LocalizedName): Category {
    const existing = this.repository.findById(id);
    if (!existing) {
      throw new HttpError(MESSAGES.CATEGORY_NOT_FOUND, CODES.CATEGORY_NOT_FOUND, 404);
    }
    const merged: LocalizedName = { ...existing.names, ...names };
    return this.repository.updateNames(id, merged);
  }
}
