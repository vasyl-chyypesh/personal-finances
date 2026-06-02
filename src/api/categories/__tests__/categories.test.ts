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
    findByName: () => undefined,
    create: () => {
      throw new Error('not implemented');
    },
    ...overrides,
  };
}

const stubCategories: Category[] = [
  { id: 1, name: 'grocery' },
  { id: 2, name: 'sport' },
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

  it('list delegates to repository.findAll exactly once', () => {
    let calls = 0;
    const service = new CategoriesService(
      makeMockCategoriesRepo({
        findAll: () => {
          calls += 1;
          return stubCategories;
        },
      }),
    );
    service.list();
    assert.equal(calls, 1);
  });
});
