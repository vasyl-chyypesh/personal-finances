import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import {
  DEFAULT_RATE_PRESET,
  isRatePreset,
  presetRange,
  type RatePreset,
} from '../lib/rateRange.ts';
import { QUOTE_CURRENCIES } from '../types.ts';
import type { QuoteCurrency } from '../types.ts';

export interface CurrencyChartParams {
  range: RatePreset;
  /** ISO bounds derived from the preset. */
  from: string;
  to: string;
  /** Currencies currently drawn (always at least one). */
  visible: QuoteCurrency[];
  setRange: (r: RatePreset) => void;
  toggleSeries: (c: QuoteCurrency) => void;
}

function parseVisible(raw: string | null): QuoteCurrency[] {
  if (!raw) return [...QUOTE_CURRENCIES];
  const picked = QUOTE_CURRENCIES.filter((c) => raw.split(',').includes(c));
  return picked.length > 0 ? picked : [...QUOTE_CURRENCIES];
}

/**
 * Chart range + visible series, persisted in the URL search params so a view is
 * shareable/bookmarkable (matches the ledger filters). Defaults are omitted from
 * the URL to keep it clean.
 */
export function useCurrencyChartParams(): CurrencyChartParams {
  const [params, setParams] = useSearchParams();

  const update = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const rangeRaw = params.get('range');
  const range = isRatePreset(rangeRaw) ? rangeRaw : DEFAULT_RATE_PRESET;
  const { from, to } = useMemo(() => presetRange(range), [range]);

  const curRaw = params.get('cur');
  const visible = useMemo(() => parseVisible(curRaw), [curRaw]);

  return {
    range,
    from,
    to,
    visible,
    setRange: (r) =>
      update((n) => (r === DEFAULT_RATE_PRESET ? n.delete('range') : n.set('range', r))),
    toggleSeries: (c) =>
      update((n) => {
        const set = new Set(visible);
        if (set.has(c)) {
          if (set.size > 1) set.delete(c); // never hide the last series
        } else {
          set.add(c);
        }
        const next = QUOTE_CURRENCIES.filter((q) => set.has(q));
        if (next.length === QUOTE_CURRENCIES.length) n.delete('cur');
        else n.set('cur', next.join(','));
      }),
  };
}
