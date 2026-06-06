import { useEffect, useState } from 'react';
import { getCategories } from '../../../lib/client.ts';
import { ApiError } from '../../../lib/client.ts';
import type { Category } from '../../../types.ts';

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
}

export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getCategories()
      .then((data) => {
        if (active) {
          setCategories(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load categories');
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading, error };
}
