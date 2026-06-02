import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CategoriesService } from '../categories.service.js';
import type { ICategoriesRepository } from '../categories.repository.js';
import type { Category } from '../categories.types.js';

function makeMockCategoriesRepo(
  overrides: Partial<ICategoriesRepository> = {},
): ICategoriesRepository {
  return {
    findAll: () => [],
    findById: () => undefined,
    findBySlug: () => undefined,
    create: (slug, names) => ({ id: 1, slug, names }),
    updateNames: (id, names) => ({ id, slug: 'x', names }),
    ...overrides,
  };
}

const stubCategories: Category[] = [
  { id: 1, slug: 'grocery', names: { en: 'Groceries', uk: 'Продукти харчування' } },
  { id: 2, slug: 'sport', names: { en: 'Sport', uk: 'Спорт' } },
];

describe('CategoriesService (unit)', () => {
  it('list returns the categories from the repository', () => {
    const service = new CategoriesService(
      makeMockCategoriesRepo({ findAll: () => stubCategories }),
    );
    assert.deepEqual(service.list(), stubCategories);
  });

  it('list returns an empty array when the repository has none', () => {
    const service = new CategoriesService(makeMockCategoriesRepo({ findAll: () => [] }));
    assert.deepEqual(service.list(), []);
  });

  it('updateNames merges new translations into existing names', () => {
    let mergedArg: Category['names'] | undefined;
    const service = new CategoriesService(
      makeMockCategoriesRepo({
        findById: () => ({ id: 1, slug: 'charity', names: { uk: 'Благодійність' } }),
        updateNames: (_id, names) => {
          mergedArg = names;
          return { id: 1, slug: 'charity', names };
        },
      }),
    );
    const result = service.updateNames(1, { en: 'Charity' });
    assert.deepEqual(mergedArg, { uk: 'Благодійність', en: 'Charity' });
    assert.deepEqual(result.names, { uk: 'Благодійність', en: 'Charity' });
  });

  it('updateNames throws 404 when the category does not exist', () => {
    const service = new CategoriesService(makeMockCategoriesRepo({ findById: () => undefined }));
    assert.throws(() => service.updateNames(99999, { en: 'x' }), /not found/i);
  });
});
