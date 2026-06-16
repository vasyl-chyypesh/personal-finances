import { useEffect, useState } from 'react';
import { ApiError, getRatesHistory } from '../lib/client.ts';
import type { RateHistoryResponse } from '../types.ts';

export interface UseRatesHistoryResult {
  history: RateHistoryResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * Exchange-rate time series for charts. With no bounds the API returns its full
 * allowed window (the last few months). Read-only.
 */
export function useRatesHistory(opts?: { from?: string; to?: string }): UseRatesHistoryResult {
  const [history, setHistory] = useState<RateHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = opts?.from;
  const to = opts?.to;

  useEffect(() => {
    let active = true;
    setLoading(true);
    getRatesHistory({ from, to })
      .then((data) => {
        if (active) {
          setHistory(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load rate history');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [from, to]);

  return { history, loading, error };
}
