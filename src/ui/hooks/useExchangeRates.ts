import { useEffect, useState } from 'react';
import { ApiError, getExchangeRates } from '../lib/client.ts';
import type { ExchangeRates } from '../types.ts';

interface UseExchangeRatesResult {
  rates: ExchangeRates | null;
  loading: boolean;
  error: string | null;
}

export function useExchangeRates(): UseExchangeRatesResult {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getExchangeRates()
      .then((data) => {
        if (active) {
          setRates(data.rates);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load exchange rates');
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

  return { rates, loading, error };
}
