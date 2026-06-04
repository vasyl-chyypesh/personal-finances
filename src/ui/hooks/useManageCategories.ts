import { useCallback, useEffect, useState } from 'react';
import {
  ApiError,
  createCategory,
  deleteCategory,
  getCategories,
  reorderCategories,
  restoreCategory,
  updateCategoryNames,
} from '../lib/client.ts';
import type { Category, CreateCategoryDto, LocalizedName } from '../types.ts';

interface UseManageCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (dto: CreateCategoryDto) => Promise<void>;
  updateNames: (id: number, names: LocalizedName) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
  reorder: (ids: number[]) => Promise<void>;
}

function toMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function useManageCategories(includeDeleted: boolean): UseManageCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return getCategories(includeDeleted)
      .then((data) => {
        setCategories(data);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(toMessage(err, 'Failed to load categories'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [includeDeleted]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(
    async (dto: CreateCategoryDto) => {
      await createCategory(dto);
      await load();
    },
    [load],
  );

  const updateNames = useCallback(
    async (id: number, names: LocalizedName) => {
      await updateCategoryNames(id, names);
      await load();
    },
    [load],
  );

  const remove = useCallback(
    async (id: number) => {
      await deleteCategory(id);
      await load();
    },
    [load],
  );

  const restore = useCallback(
    async (id: number) => {
      await restoreCategory(id);
      await load();
    },
    [load],
  );

  const reorder = useCallback(
    async (ids: number[]) => {
      // Optimistically reflect the new order, then persist.
      setCategories((prev) => {
        const byId = new Map(prev.map((c) => [c.id, c]));
        return ids.map((id) => byId.get(id)).filter((c): c is Category => c !== undefined);
      });
      try {
        await reorderCategories(ids);
      } catch (err: unknown) {
        setError(toMessage(err, 'Failed to reorder categories'));
        await load();
      }
    },
    [load],
  );

  return {
    categories,
    loading,
    error,
    refresh: load,
    create,
    updateNames,
    remove,
    restore,
    reorder,
  };
}
