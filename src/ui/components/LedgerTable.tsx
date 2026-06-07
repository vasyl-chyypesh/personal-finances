import { useMemo } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { parseISODate } from '../lib/datePeriod.ts';
import { AmountDisplay } from './AmountDisplay.tsx';
import { CategoryBadge } from './CategoryBadge.tsx';
import { StatusBadge } from './StatusBadge.tsx';
import { EmptyState } from './EmptyState.tsx';
import { SkeletonRow } from './SkeletonRow.tsx';
import { InboxIcon, SortAscIcon, SortDescIcon, SortIcon } from './icons.tsx';
import type { Locale } from '../types.ts';
import type { LedgerEntry } from '../types.ts';

export type LedgerSortKey = 'date' | 'description' | 'category' | 'currency' | 'amount' | 'status';
export type SortDir = 'asc' | 'desc';
export interface LedgerSort {
  key: LedgerSortKey;
  dir: SortDir;
}

export interface LedgerTableProps {
  records: LedgerEntry[];
  loading?: boolean;
  sort: LedgerSort | null;
  onSortChange: (sort: LedgerSort) => void;
  onRowClick?: (record: LedgerEntry) => void;
}

interface Column {
  key: LedgerSortKey;
  labelKey: 'list.date' | 'list.description' | 'list.category' | 'form.currency' | 'list.amount';
  width: string;
  align: 'left' | 'right';
}

const COLUMNS: Column[] = [
  { key: 'date', labelKey: 'list.date', width: 'w-28', align: 'left' },
  { key: 'description', labelKey: 'list.description', width: 'w-auto', align: 'left' },
  { key: 'category', labelKey: 'list.category', width: 'w-44', align: 'left' },
  { key: 'currency', labelKey: 'form.currency', width: 'w-24', align: 'left' },
  { key: 'amount', labelKey: 'list.amount', width: 'w-36', align: 'right' },
];

const dateFmt = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  timeZone: 'UTC',
});

function compare(a: LedgerEntry, b: LedgerEntry, key: LedgerSortKey, locale: Locale): number {
  switch (key) {
    case 'date':
      return a.date.localeCompare(b.date);
    case 'description':
      return (a.description ?? '').localeCompare(b.description ?? '');
    case 'category':
      return categoryName(a.category, locale).localeCompare(categoryName(b.category, locale));
    case 'currency':
      return a.currency.localeCompare(b.currency);
    case 'amount':
      return a.amount - b.amount;
    case 'status':
      return a.type.localeCompare(b.type);
  }
}

export function LedgerTable({
  records,
  loading,
  sort,
  onSortChange,
  onRowClick,
}: LedgerTableProps) {
  const { t, locale } = useI18n();

  const sorted = useMemo(() => {
    if (!sort) return records;
    const copy = [...records];
    copy.sort((a, b) => {
      const r = compare(a, b, sort.key, locale);
      return sort.dir === 'asc' ? r : -r;
    });
    return copy;
  }, [records, sort, locale]);

  const toggleSort = (key: LedgerSortKey) => {
    if (sort?.key === key) {
      onSortChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, dir: 'asc' });
    }
  };

  const sortIcon = (key: LedgerSortKey) => {
    if (sort?.key !== key) return <SortIcon size={13} className="opacity-40" />;
    return sort.dir === 'asc' ? <SortAscIcon size={13} /> : <SortDescIcon size={13} />;
  };

  const headerButton = (key: LedgerSortKey, label: string, align: 'left' | 'right') => (
    <button
      type="button"
      onClick={() => toggleSort(key)}
      aria-label={t('ledger.sortBy', { column: label })}
      aria-sort={sort?.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`flex items-center gap-1 text-2xs font-medium tracking-wide text-fg-muted uppercase transition-colors duration-100 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary ${
        align === 'right' ? 'ml-auto flex-row-reverse' : ''
      }`}
    >
      {label}
      {sortIcon(key)}
    </button>
  );

  if (!loading && records.length === 0) {
    return (
      <EmptyState
        icon={<InboxIcon size={22} />}
        title={t('ledger.emptyTitle')}
        description={t('ledger.emptyBody')}
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          {COLUMNS.map((c) => (
            <col key={c.key} className={c.width} />
          ))}
          <col className="w-28" />
        </colgroup>
        <thead>
          <tr className="border-b-hairline border-line">
            {COLUMNS.map((c) => (
              <th key={c.key} scope="col" className="px-3 py-2 text-left">
                {headerButton(c.key, t(c.labelKey), c.align)}
              </th>
            ))}
            <th scope="col" className="px-3 py-2 text-left">
              {headerButton('status', t('ledger.status'), 'left')}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} columns={6} />)
            : sorted.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onRowClick?.(r)}
                  className="cursor-pointer border-b-hairline border-line transition-colors duration-100 hover:bg-surface-muted"
                >
                  <td className="px-3 py-2.5 text-fg-muted tabular-nums">
                    {dateFmt.format(parseISODate(r.date))}
                  </td>
                  <td className="truncate px-3 py-2.5 text-fg">
                    {r.description?.trim() || categoryName(r.category, locale)}
                  </td>
                  <td className="px-3 py-2.5">
                    <CategoryBadge category={r.category} bare />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-fg-muted">{r.currency}</td>
                  <td className="px-3 py-2.5 text-right">
                    <AmountDisplay
                      amount={r.amount}
                      currency={r.currency}
                      type={r.type}
                      size="sm"
                      align="right"
                      showCode={false}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge status={r.type} />
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}
