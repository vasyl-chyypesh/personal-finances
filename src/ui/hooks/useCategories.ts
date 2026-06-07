import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  createCategory,
  deleteCategory,
  getCategories,
  restoreCategory,
  updateCategoryNames,
} from '../lib/client.ts';
import type { Category, CreateCategoryDto, LocalizedName } from '../types.ts';

export interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  create: (dto: CreateCategoryDto) => Promise<void>;
  rename: (id: number, names: LocalizedName) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/** Categories list + CRUD wrappers. The only network seam for category data. */
export function useCategories(includeDeleted = false): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    (isActive: () => boolean = () => true) => {
      setLoading(true);
      return getCategories(includeDeleted)
        .then((data) => {
          if (isActive()) {
            setCategories(data);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (isActive()) setError(toMessage(err, 'Failed to load categories'));
        })
        .finally(() => {
          if (isActive()) setLoading(false);
        });
    },
    [includeDeleted],
  );

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const create = useCallback(
    async (dto: CreateCategoryDto) => {
      await createCategory(dto);
      await load();
    },
    [load],
  );

  // Optimistic: apply the rename immediately, reconcile with the server
  // response, and roll back to the prior snapshot on failure.
  const rename = useCallback(async (id: number, names: LocalizedName) => {
    let snapshot: Category[] = [];
    setCategories((prev) => {
      snapshot = prev;
      return prev.map((c) => (c.id === id ? { ...c, names } : c));
    });
    try {
      const saved = await updateCategoryNames(id, names);
      setCategories((prev) => prev.map((c) => (c.id === id ? saved : c)));
    } catch (err) {
      setCategories(snapshot);
      throw err;
    }
  }, []);

  const remove = useCallback(async (id: number) => {
    let snapshot: Category[] = [];
    setCategories((prev) => {
      snapshot = prev;
      return prev.filter((c) => c.id !== id);
    });
    try {
      await deleteCategory(id);
    } catch (err) {
      setCategories(snapshot);
      throw err;
    }
  }, []);

  const restore = useCallback(
    async (id: number) => {
      await restoreCategory(id);
      await load();
    },
    [load],
  );

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  return { categories, loading, error, refresh, create, rename, remove, restore };
}
