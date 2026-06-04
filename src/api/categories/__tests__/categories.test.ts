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
    softDelete: (id, deletedAt) => ({ id, slug: 'x', names: {}, deletedAt }),
    restore: (id) => ({ id, slug: 'x', names: {}, deletedAt: null }),
    reorder: () => undefined,
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

  it('create derives a slug from the English name', () => {
    let createdSlug: string | undefined;
    const service = new CategoriesService(
      makeMockCategoriesRepo({
        create: (slug, names) => {
          createdSlug = slug;
          return { id: 1, slug, names };
        },
      }),
    );
    service.create({ en: 'Coffee Beans', uk: 'Кавові зерна' });
    assert.equal(createdSlug, 'coffee-beans');
  });

  it('create falls back to the Ukrainian name for the slug', () => {
    let createdSlug: string | undefined;
    const service = new CategoriesService(
      makeMockCategoriesRepo({
        create: (slug, names) => {
          createdSlug = slug;
          return { id: 1, slug, names };
        },
      }),
    );
    service.create({ uk: 'Кава' });
    assert.equal(createdSlug, 'кава');
  });

  it('create throws 409 when the slug already exists', () => {
    const service = new CategoriesService(
      makeMockCategoriesRepo({
        findBySlug: () => ({ id: 1, slug: 'coffee', names: { en: 'Coffee' } }),
      }),
    );
    assert.throws(() => service.create({ en: 'Coffee' }), /already exists/i);
  });

  it('remove throws 404 when the category does not exist', () => {
    const service = new CategoriesService(makeMockCategoriesRepo({ findById: () => undefined }));
    assert.throws(() => service.remove(99999), /not found/i);
  });

  it('restore throws 404 when the category does not exist', () => {
    const service = new CategoriesService(makeMockCategoriesRepo({ findById: () => undefined }));
    assert.throws(() => service.restore(99999), /not found/i);
  });

  it('reorder delegates the id list to the repository', () => {
    let receivedIds: number[] | undefined;
    const service = new CategoriesService(
      makeMockCategoriesRepo({
        reorder: (ids) => {
          receivedIds = ids;
        },
      }),
    );
    service.reorder([3, 1, 2]);
    assert.deepEqual(receivedIds, [3, 1, 2]);
  });
});
