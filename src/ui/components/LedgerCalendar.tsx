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

// Column class constants — shared across head/body/foot so columns stay aligned.
// Bands are neutral (surface-muted); color is carried by the section label and
// the totals, not by flooding whole rows — keeps the day axis scannable and
// dark mode calm. The category and total columns are separated from the day
// grid by a stronger divider.
const catCol =
  'sticky left-0 z-10 w-40 min-w-40 max-w-40 truncate px-2 py-1.5 text-left border-r-hairline border-line-strong';
const dayHeadCell =
  'min-w-12 border-r-hairline border-line px-1.5 py-1.5 text-right text-2xs font-medium tabular-nums';
const dayCell =
  'min-w-12 border-r-hairline border-line px-1.5 py-1.5 text-right font-mono tabular-nums whitespace-nowrap';
const totalCol =
  'min-w-20 border-l-hairline border-line-strong px-2 py-1.5 text-right font-mono font-medium tabular-nums whitespace-nowrap';
const pctCol =
  'min-w-14 border-l-hairline border-line px-2 py-1.5 text-right font-mono text-fg-muted tabular-nums';

function SectionTable({
  section,
  days,
  todayDay,
  onCellClick,
}: {
  section: PivotSection;
  days: number;
  /** Day-of-month to highlight, or -1 when the viewed month isn't current. */
  todayDay: number;
  onCellClick: LedgerCalendarProps['onCellClick'];
}) {
  const { t, locale } = useI18n();
  const dayList = Array.from({ length: days }, (_, i) => i + 1);
  const isExpense = section.type === 'expense';
  // Color carries on the section label + totals only, not the whole band.
  const sectionText = isExpense ? 'text-expense-text' : 'text-income-text';
  const colLabel = isExpense ? t('calendar.category') : t('calendar.source');

  return (
    <div className="overflow-x-auto rounded-lg border-hairline border-line">
      <table className="border-collapse text-xs">
        <thead>
          <tr className="bg-surface-muted">
            <th className={`${catCol} z-20 bg-surface-muted font-medium ${sectionText}`}>
              {colLabel}
            </th>
            {dayList.map((d) => (
              <th
                key={d}
                aria-current={d === todayDay ? 'date' : undefined}
                className={`${dayHeadCell} ${d === todayDay ? 'text-primary' : 'text-fg-subtle'}`}
              >
                {d}
              </th>
            ))}
            <th className={`${totalCol} font-medium text-fg-muted`}>{t('calendar.total')}</th>
            <th className={`${pctCol} font-medium text-fg-muted`}>{t('calendar.percent')}</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row) => (
            <tr
              key={row.category.id}
              className="border-b-hairline border-line transition-colors duration-100 hover:bg-surface-muted"
            >
              <th scope="row" className={`${catCol} bg-surface-muted text-sm font-normal text-fg`}>
                {categoryName(row.category, locale)}
              </th>
              {row.cells.map((value, i) => {
                // eslint-disable-next-line security/detect-object-injection -- i is the bounded map index
                const note = row.notes[i];
                return (
                  <td key={i} className={dayCell}>
                    {value ? (
                      <button
                        type="button"
                        onClick={() => onCellClick(section.type, row.category, i + 1)}
                        className="relative inline-block w-full rounded-sm px-1 text-right font-medium text-fg transition-colors duration-100 hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
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
              <td className={`${totalCol} ${sectionText}`}>
                {totalFmt.format(centsToMajor(row.total))}
              </td>
              <td className={pctCol}>
                {section.total > 0 ? ((row.total / section.total) * 100).toFixed(2) : '0.00'}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-surface-muted font-medium">
            <th scope="row" className={`${catCol} z-20 bg-surface-muted ${sectionText}`}>
              {t('calendar.total')}
            </th>
            {section.dayTotals.map((value, i) => (
              <td key={i} className={`${dayCell} text-fg`}>
                {value ? cellFmt.format(centsToMajor(value)) : ''}
              </td>
            ))}
            <td className={`${totalCol} ${sectionText}`}>
              {totalFmt.format(centsToMajor(section.total))}
            </td>
            <td className={`${pctCol} text-fg`}>100%</td>
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

  // Highlight today's column only when the grid shows the current month.
  const now = new Date();
  const todayDay = year === now.getFullYear() && month === now.getMonth() + 1 ? now.getDate() : -1;

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
            todayDay={todayDay}
            onCellClick={onCellClick}
          />
        ),
      )}
    </div>
  );
}
