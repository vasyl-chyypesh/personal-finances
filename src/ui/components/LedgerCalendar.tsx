import { useMemo } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { centsToMajor } from '../lib/money.ts';
import { buildPivot, type PivotSection } from '../lib/ledgerPivot.ts';
import { EmptyState } from './EmptyState.tsx';
import { InboxIcon } from './icons.tsx';
import type { Category, Currency, ExchangeRates, LedgerEntry, LedgerEntryType } from '../types.ts';

export interface LedgerCalendarProps {
  /** Category-filtered records (not type-filtered). */
  records: LedgerEntry[];
  year: number;
  /** 1-based month. */
  month: number;
  base: Currency;
  rates: ExchangeRates | null;
  typeFilter: 'all' | 'income' | 'expense';
  loading?: boolean;
  onCellClick: (type: LedgerEntryType, category: Category, day: number) => void;
}

const cellFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const totalFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numCell = 'min-w-12 px-1.5 py-1.5 text-right font-mono tabular-nums whitespace-nowrap';
const firstCol =
  'sticky left-0 z-10 w-40 min-w-40 max-w-40 truncate px-2 py-1.5 text-left bg-surface';

function SectionTable({
  section,
  days,
  onCellClick,
}: {
  section: PivotSection;
  days: number;
  onCellClick: LedgerCalendarProps['onCellClick'];
}) {
  const { t, locale } = useI18n();
  const dayList = Array.from({ length: days }, (_, i) => i + 1);
  const isExpense = section.type === 'expense';
  const tint = isExpense ? 'bg-expense-bg text-expense-text' : 'bg-income-bg text-income-text';
  const colLabel = isExpense ? t('calendar.category') : t('calendar.source');

  return (
    <div className="overflow-x-auto rounded-lg border-hairline border-line">
      <table className="border-collapse text-xs">
        <thead>
          <tr className={tint}>
            <th className={`${firstCol} z-20 ${tint} font-medium`}>{colLabel}</th>
            {dayList.map((d) => (
              <th key={d} className="min-w-12 px-1.5 py-1.5 text-right font-medium tabular-nums">
                {d}
              </th>
            ))}
            <th className="min-w-20 px-2 py-1.5 text-right font-medium">{t('calendar.total')}</th>
            <th className="min-w-14 px-2 py-1.5 text-right font-medium">{t('calendar.percent')}</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr
              key={row.category.id}
              className="border-b-hairline border-line hover:bg-surface-muted"
            >
              <th scope="row" className={`${firstCol} text-base font-normal text-fg`}>
                {categoryName(row.category, locale)}
              </th>
              {row.cells.map((value, i) => {
                // eslint-disable-next-line security/detect-object-injection -- i is the bounded map index
                const note = row.notes[i];
                return (
                  <td key={i} className={numCell}>
                    {value ? (
                      <button
                        type="button"
                        onClick={() => onCellClick(section.type, row.category, i + 1)}
                        className="relative inline-block w-full rounded-sm px-1 text-right text-fg transition-colors duration-100 hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                      >
                        {cellFmt.format(centsToMajor(value))}
                        {note ? (
                          <span
                            aria-hidden
                            className="absolute top-0 right-0 h-0 w-0 border-t-[5px] border-l-[5px] border-t-accent border-l-transparent"
                          />
                        ) : null}
                      </button>
                    ) : null}
                  </td>
                );
              })}
              <td className={`${numCell} font-medium text-fg`}>
                {totalFmt.format(centsToMajor(row.total))}
              </td>
              <td className="min-w-14 px-2 py-1.5 text-right font-mono text-fg-muted tabular-nums">
                {section.total > 0 ? ((row.total / section.total) * 100).toFixed(2) : '0.00'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className={`${tint} font-medium`}>
            <th scope="row" className={`${firstCol} z-20 ${tint}`}>
              {t('calendar.total')}
            </th>
            {section.dayTotals.map((value, i) => (
              <td key={i} className={numCell}>
                {value ? cellFmt.format(centsToMajor(value)) : ''}
              </td>
            ))}
            <td className={numCell}>{totalFmt.format(centsToMajor(section.total))}</td>
            <td className="min-w-14 px-2 py-1.5 text-right font-mono tabular-nums">100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Month pivot grid: categories × days, split into expense and income sections,
 * with per-row totals/percent and a per-day totals row. */
export function LedgerCalendar({
  records,
  year,
  month,
  base,
  rates,
  typeFilter,
  loading,
  onCellClick,
}: LedgerCalendarProps) {
  const { t } = useI18n();
  const pivot = useMemo(
    () => buildPivot(records, { year, month, base, rates }),
    [records, year, month, base, rates],
  );

  const sections = pivot.sections.filter((s) => typeFilter === 'all' || s.type === typeFilter);

  if (loading) {
    return (
      <div className="space-y-2 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-7 animate-pulse rounded-sm bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (sections.every((s) => s.rows.length === 0)) {
    return (
      <EmptyState
        icon={<InboxIcon size={22} />}
        title={t('ledger.emptyTitle')}
        description={t('ledger.emptyBody')}
      />
    );
  }

  return (
    <div className="space-y-6 p-2">
      {sections.map((section) =>
        section.rows.length === 0 ? null : (
          <SectionTable
            key={section.type}
            section={section}
            days={pivot.daysInMonth}
            onCellClick={onCellClick}
          />
        ),
      )}
    </div>
  );
}
