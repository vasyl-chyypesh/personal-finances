import { useMemo, useState } from 'react';
import { MonthPicker } from '../components/MonthPicker.tsx';
import { CurrencySelector } from '../../exchange-rates/components/CurrencySelector.tsx';
import { ExchangeRatesPanel } from '../../exchange-rates/components/ExchangeRatesPanel.tsx';
import { LedgerTable } from '../components/LedgerTable.tsx';
import { CellEntriesModal, type CellDescriptor } from '../components/CellEntriesModal.tsx';
import { useCategories } from '../../categories/hooks/useCategories.ts';
import { useLedger } from '../hooks/useLedger.ts';
import { useExchangeRates } from '../../exchange-rates/hooks/useExchangeRates.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { pivot } from '../lib/pivot.ts';
import { Alert } from '../../../components/ui/Alert.tsx';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';
import { TableSkeleton } from '../../../components/ui/Skeleton.tsx';
import type { Category, Currency, LedgerEntryType } from '../../../types.ts';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function TablePage() {
  const { locale, t } = useI18n();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [currency, setCurrency] = useState<Currency>('UAH');
  const [openCell, setOpenCell] = useState<CellDescriptor | null>(null);

  const { categories } = useCategories();
  const { result, loading, error, create, update, remove } = useLedger('month', { year, month });
  const { rates, error: ratesError } = useExchangeRates();

  const records = useMemo(() => result?.records ?? [], [result]);
  const daysInMonth = new Date(year, month, 0).getDate();

  const pivoted = useMemo(() => {
    if (!rates) {
      return null;
    }
    return pivot(records, currency, daysInMonth, rates);
  }, [records, currency, daysInMonth, rates]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );

  const cellEntries = openCell
    ? records.filter(
        (e) =>
          e.type === openCell.type &&
          e.category.id === openCell.category.id &&
          e.date === openCell.date,
      )
    : [];

  function handleCellClick(type: LedgerEntryType, category: Category, day: number) {
    setOpenCell({ type, category, date: `${year}-${pad(month)}-${pad(day)}` });
  }

  return (
    <div>
      {rates ? <ExchangeRatesPanel rates={rates} /> : null}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <MonthPicker
            year={year}
            month={month}
            onChange={(y, m) => {
              setYear(y);
              setMonth(m);
            }}
          />
          <CurrencySelector value={currency} onChange={setCurrency} />
        </div>
        <h2 className="text-lg font-semibold capitalize text-fg">{monthLabel}</h2>
      </div>

      {ratesError ? <Alert className="mb-4">{t('table.ratesError')}</Alert> : null}
      {error ? <Alert className="mb-4">{error}</Alert> : null}

      {loading || !pivoted ? (
        <TableSkeleton rows={6} />
      ) : records.length === 0 ? (
        <EmptyState message={t('table.empty')} />
      ) : (
        <LedgerTable pivot={pivoted} currency={currency} onCellClick={handleCellClick} />
      )}

      {openCell ? (
        <CellEntriesModal
          cell={openCell}
          entries={cellEntries}
          categories={categories}
          onCreate={create}
          onUpdate={update}
          onDelete={remove}
          onClose={() => setOpenCell(null)}
        />
      ) : null}
    </div>
  );
}
