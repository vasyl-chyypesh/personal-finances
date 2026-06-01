import type { ICategoriesRepository } from './categories.repository.js';
import type { Category } from './categories.types.js';

export class CategoriesService {
  constructor(private readonly repository: ICategoriesRepository) {}

  list(): Category[] {
    return this.repository.findAll();
  }
}
