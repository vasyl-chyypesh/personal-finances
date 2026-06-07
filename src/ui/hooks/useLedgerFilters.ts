import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { parseISODate, toISODate } from '../lib/datePeriod.ts';
import type { TypeFilter } from '../components/LedgerFilter.tsx';
import type { LedgerSort, LedgerSortKey, SortDir } from '../components/LedgerTable.tsx';

export type LedgerView = 'list' | 'table' | 'calendar';

export interface LedgerFiltersState {
  period: 'week' | 'month';
  date: Date;
  type: TypeFilter;
  categoryIds: number[];
  view: LedgerView;
  sort: LedgerSort | null;

  setPeriod: (p: 'week' | 'month') => void;
  setDate: (d: Date) => void;
  setType: (t: TypeFilter) => void;
  setCategoryIds: (ids: number[]) => void;
  setView: (v: LedgerView) => void;
  setSort: (s: LedgerSort) => void;
}

const SORT_KEYS: LedgerSortKey[] = [
  'date',
  'description',
  'category',
  'currency',
  'amount',
  'status',
];

function parseSort(raw: string | null): LedgerSort | null {
  if (!raw) return null;
  const [key, dir] = raw.split(':');
  if (!SORT_KEYS.includes(key as LedgerSortKey)) return null;
  return { key: key as LedgerSortKey, dir: dir === 'asc' ? 'asc' : ('desc' as SortDir) };
}

/**
 * All ledger filter/sort/view state lives in the URL search params, so a filtered
 * view is shareable and bookmarkable. Updates use `replace` to avoid flooding
 * history while tweaking filters.
 */
export function useLedgerFilters(): LedgerFiltersState {
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

  const period = params.get('period') === 'week' ? 'week' : 'month';
  const viewRaw = params.get('view');
  const view: LedgerView = viewRaw === 'table' || viewRaw === 'calendar' ? viewRaw : 'list';
  const typeRaw = params.get('type');
  const type: TypeFilter = typeRaw === 'income' || typeRaw === 'expense' ? typeRaw : 'all';

  const dateRaw = params.get('date');
  const date = useMemo(
    () => (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? parseISODate(dateRaw) : new Date()),
    [dateRaw],
  );

  const catsRaw = params.get('cats');
  const categoryIds = useMemo(
    () =>
      catsRaw
        ? catsRaw
            .split(',')
            .map(Number)
            .filter((n) => Number.isInteger(n) && n > 0)
        : [],
    [catsRaw],
  );

  const sort = useMemo(() => parseSort(params.get('sort')), [params]);

  return {
    period,
    date,
    type,
    categoryIds,
    view,
    sort: sort ?? { key: 'date', dir: 'desc' },

    setPeriod: (p) => update((n) => n.set('period', p)),
    setDate: (d) => update((n) => n.set('date', toISODate(d))),
    setType: (t) => update((n) => (t === 'all' ? n.delete('type') : n.set('type', t))),
    setCategoryIds: (ids) =>
      update((n) => (ids.length === 0 ? n.delete('cats') : n.set('cats', ids.join(',')))),
    setView: (v) => update((n) => n.set('view', v)),
    setSort: (s) => update((n) => n.set('sort', `${s.key}:${s.dir}`)),
  };
}
