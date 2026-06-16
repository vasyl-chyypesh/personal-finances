import { useEffect, useState } from 'react';
import { ApiError, getExchangeRates } from '../lib/client.ts';
import { CURRENCIES } from '../types.ts';
import type { Currency, ExchangeRates } from '../types.ts';

export interface UseCurrenciesResult {
  currencies: Currency[];
  base: Currency | null;
  rates: ExchangeRates | null;
  /** ISO date the matrix was sourced for. */
  asOf: string | null;
  /** True when the served rates are older than the freshness threshold. */
  stale: boolean;
  loading: boolean;
  error: string | null;
}

/** Exchange-rate matrix + base currency. Read-only (no write route exists). */
export function useCurrencies(): UseCurrenciesResult {
  const [base, setBase] = useState<Currency | null>(null);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getExchangeRates()
      .then((data) => {
        if (active) {
          setBase(data.base);
          setRates(data.rates);
          setAsOf(data.asOf);
          setStale(data.stale);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof ApiError ? err.message : 'Failed to load currencies');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { currencies: CURRENCIES, base, rates, asOf, stale, loading, error };
}
