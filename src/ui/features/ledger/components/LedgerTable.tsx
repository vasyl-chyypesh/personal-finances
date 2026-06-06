import type { Category, Currency, LedgerEntryType, Locale } from '../../../types.ts';
import type { PivotResult, PivotSection } from '../lib/pivot.ts';
import { categoryName } from '../../../i18n/categoryName.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { centsToMajor } from '../../../lib/money.ts';

export interface LedgerTableProps {
  pivot: PivotResult;
  currency: Currency;
  onCellClick: (type: LedgerEntryType, category: Category, day: number) => void;
}

export interface SectionProps {
  title: string;
  type: LedgerEntryType;
  section: PivotSection;
  daysInMonth: number;
  locale: Locale;
  /** Tailwind classes for the section's header row accent. */
  accent: string;
  totalLabel: string;
  percentLabel: string;
  openCellLabel: (category: string, day: number) => string;
  onCellClick: (type: LedgerEntryType, category: Category, day: number) => void;
}

function formatCell(amount: number, locale: Locale): string {
  if (amount === 0) {
    return '';
  }
  return centsToMajor(amount).toLocaleString(locale, { maximumFractionDigits: 2 });
}

function formatTotal(amount: number, locale: Locale): string {
  return centsToMajor(amount).toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** A chat-bubble indicator shown on cells whose entries carry a description. */
function NoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="ml-0.5 inline-block h-3 w-3 align-text-top text-info"
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
  openCellLabel,
  onCellClick,
}: SectionProps) {
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const stickyCol =
    'sticky left-0 z-10 min-w-[11rem] border-r-2 border-line-strong px-3 py-2 text-left';
  const dayCol = 'min-w-[3.5rem] border-r border-line px-1.5 py-2';
  const totalCol = 'min-w-[6rem] border-r border-line px-3 py-2';
  const pctCol = 'min-w-[3.5rem] px-2 py-2';

  return (
    <section className="mb-8">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-fg-muted">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-sm">
        <table className="min-w-full border-collapse text-right text-xs">
          <thead className={accent}>
            <tr className="border-b border-line-strong">
              <th className={`${stickyCol} ${accent} font-medium text-fg`}>{title}</th>
              {days.map((d) => (
                <th key={d} className={`${dayCol} font-medium text-fg-muted`}>
                  {d}
                </th>
              ))}
              <th className={`${totalCol} font-semibold text-fg`}>{totalLabel}</th>
              <th className={`${pctCol} font-medium text-fg-muted`}>{percentLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {section.rows.map((row) => (
              <tr
                key={row.category.id}
                className="transition-colors duration-150 hover:bg-surface-muted"
              >
                <td className={`${stickyCol} bg-surface font-medium text-fg`}>
                  {categoryName(row.category, locale)}
                </td>
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={openCellLabel(categoryName(row.category, locale), i + 1)}
                    onClick={() => onCellClick(type, row.category, i + 1)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onCellClick(type, row.category, i + 1);
                      }
                    }}
                    title={cell.notes.join('; ') || undefined}
                    className={`${dayCol} cursor-pointer tabular-nums text-fg-muted transition-colors duration-150 hover:bg-primary-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500`}
                  >
                    {formatCell(cell.amount, locale)}
                    {cell.notes.length > 0 ? <NoteIcon /> : null}
                  </td>
                ))}
                <td className={`${totalCol} bg-surface-muted font-semibold tabular-nums text-fg`}>
                  {formatTotal(row.total, locale)}
                </td>
                <td className={`${pctCol} bg-surface-muted tabular-nums text-fg-subtle`}>
                  {section.grandTotal > 0
                    ? `${((row.total / section.grandTotal) * 100).toFixed(2)}`
                    : '0.00'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line-strong font-semibold">
              <td className={`${stickyCol} bg-surface-muted text-fg`}>{totalLabel}</td>
              {section.dailyTotals.map((total, i) => (
                <td key={i} className={`${dayCol} bg-surface-muted tabular-nums text-fg-muted`}>
                  {formatCell(total, locale)}
                </td>
              ))}
              <td className={`${totalCol} bg-surface-muted tabular-nums text-fg`}>
                {formatTotal(section.grandTotal, locale)}
              </td>
              <td className={`${pctCol} bg-surface-muted text-fg-subtle`}>
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
  // BEFORE: click-only <td>s with amber/slate hardcoded colors
  // AFTER: keyboard-operable cells (role/tabindex/Enter-Space) + semantic token accents
  const openCellLabel = (category: string, day: number) => t('table.openCell', { category, day });

  return (
    <div>
      <p className="mb-3 text-xs text-fg-muted">
        {t('table.currency')}: <span className="font-semibold text-fg">{currency}</span>
      </p>
      <Section
        title={t('table.expenses')}
        type="expense"
        section={pivot.expense}
        daysInMonth={pivot.daysInMonth}
        locale={locale}
        accent="bg-error/10"
        totalLabel={totalLabel}
        percentLabel={percentLabel}
        openCellLabel={openCellLabel}
        onCellClick={onCellClick}
      />
      <Section
        title={t('table.income')}
        type="income"
        section={pivot.income}
        daysInMonth={pivot.daysInMonth}
        locale={locale}
        accent="bg-success/10"
        totalLabel={totalLabel}
        percentLabel={percentLabel}
        openCellLabel={openCellLabel}
        onCellClick={onCellClick}
      />
    </div>
  );
}
