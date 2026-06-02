import type { Category, Currency, LedgerEntryType, Locale } from '../types.ts';
import type { PivotResult, PivotSection } from '../lib/pivot.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { useI18n } from '../i18n/i18nContext.ts';

interface LedgerTableProps {
  pivot: PivotResult;
  currency: Currency;
  onCellClick: (type: LedgerEntryType, category: Category, day: number) => void;
}

interface SectionProps {
  title: string;
  type: LedgerEntryType;
  section: PivotSection;
  daysInMonth: number;
  locale: Locale;
  /** Tailwind classes for the section's header row accent. */
  accent: string;
  totalLabel: string;
  percentLabel: string;
  onCellClick: (type: LedgerEntryType, category: Category, day: number) => void;
}

function formatCell(amount: number, locale: Locale): string {
  if (amount === 0) {
    return '';
  }
  return amount.toLocaleString(locale, { maximumFractionDigits: 2 });
}

function formatTotal(amount: number, locale: Locale): string {
  return amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** A chat-bubble indicator shown on cells whose entries carry a description. */
function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="ml-0.5 inline-block h-3 w-3 align-text-top text-sky-500"
    >
      <path d="M4 3h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function Section({
  title,
  type,
  section,
  daysInMonth,
  locale,
  accent,
  totalLabel,
  percentLabel,
  onCellClick,
}: SectionProps) {
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const stickyCol =
    'sticky left-0 z-10 min-w-[11rem] border-r-2 border-slate-300 px-3 py-2 text-left';
  const dayCol = 'min-w-[3.5rem] border-r border-slate-200 px-1.5 py-2';
  const totalCol = 'min-w-[6rem] border-r border-slate-200 px-3 py-2';
  const pctCol = 'min-w-[3.5rem] px-2 py-2';

  return (
    <section className="mb-8">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse text-right text-xs">
          <thead className={accent}>
            <tr className="border-b border-slate-300">
              <th className={`${stickyCol} ${accent} font-medium`}>{title}</th>
              {days.map((d) => (
                <th key={d} className={`${dayCol} font-medium text-slate-600`}>
                  {d}
                </th>
              ))}
              <th className={`${totalCol} font-semibold`}>{totalLabel}</th>
              <th className={`${pctCol} font-medium text-slate-600`}>{percentLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {section.rows.map((row) => (
              <tr key={row.category.id} className="hover:bg-slate-50">
                <td className={`${stickyCol} bg-white font-medium text-slate-800`}>
                  {categoryName(row.category, locale)}
                </td>
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    onClick={() => onCellClick(type, row.category, i + 1)}
                    title={cell.notes.join('; ') || undefined}
                    className={`${dayCol} cursor-pointer tabular-nums text-slate-700 hover:bg-amber-50`}
                  >
                    {formatCell(cell.amount, locale)}
                    {cell.notes.length > 0 ? <NoteIcon /> : null}
                  </td>
                ))}
                <td className={`${totalCol} bg-slate-50 font-semibold tabular-nums text-slate-800`}>
                  {formatTotal(row.total, locale)}
                </td>
                <td className={`${pctCol} bg-slate-50 tabular-nums text-slate-500`}>
                  {section.grandTotal > 0
                    ? `${((row.total / section.grandTotal) * 100).toFixed(2)}`
                    : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 font-semibold">
              <td className={`${stickyCol} bg-slate-100`}>{totalLabel}</td>
              {section.dailyTotals.map((total, i) => (
                <td key={i} className={`${dayCol} bg-slate-100 tabular-nums text-slate-700`}>
                  {formatCell(total, locale)}
                </td>
              ))}
              <td className={`${totalCol} bg-slate-100 tabular-nums text-slate-900`}>
                {formatTotal(section.grandTotal, locale)}
              </td>
              <td className={`${pctCol} bg-slate-100 text-slate-500`}>
                {section.grandTotal > 0 ? '100.00' : '0.00'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export function LedgerTable({ pivot, currency, onCellClick }: LedgerTableProps) {
  const { locale, t } = useI18n();
  const totalLabel = t('table.total');
  const percentLabel = t('table.percent');

  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">
        {t('table.currency')}: <span className="font-semibold text-slate-700">{currency}</span>
      </p>
      <Section
        title={t('table.expenses')}
        type="expense"
        section={pivot.expense}
        daysInMonth={pivot.daysInMonth}
        locale={locale}
        accent="bg-amber-100"
        totalLabel={totalLabel}
        percentLabel={percentLabel}
        onCellClick={onCellClick}
      />
      <Section
        title={t('table.income')}
        type="income"
        section={pivot.income}
        daysInMonth={pivot.daysInMonth}
        locale={locale}
        accent="bg-green-100"
        totalLabel={totalLabel}
        percentLabel={percentLabel}
        onCellClick={onCellClick}
      />
    </div>
  );
}
