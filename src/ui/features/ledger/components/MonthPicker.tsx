import { useI18n } from '../../../i18n/i18nContext.ts';

export interface MonthPickerProps {
  year: number;
  month: number; // 1-12
  onChange: (year: number, month: number) => void;
}

function step(year: number, month: number, delta: number): { year: number; month: number } {
  const zero = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zero / 12), month: (zero % 12) + 1 };
}

/** Builds a list of years to pick from, always including the selected year. */
function yearOptions(selected: number): number[] {
  const current = new Date().getFullYear();
  const min = Math.min(current - 10, selected);
  const max = Math.max(current + 1, selected);
  const years: number[] = [];
  for (let y = max; y >= min; y -= 1) {
    years.push(y);
  }
  return years;
}

const selectClass =
  'rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-fg transition-colors duration-150 [color-scheme:light] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:[color-scheme:dark]';

const arrowClass =
  'rounded-md px-2 py-1.5 text-fg-muted transition-colors duration-150 hover:bg-surface-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const { locale, t } = useI18n();
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long' });
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    monthFormatter.format(new Date(2020, i, 1)),
  );

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-fg-muted">{t('table.month')}</span>
      <div className="inline-flex items-center gap-1 rounded-lg border border-line-strong bg-surface p-1 shadow-sm">
        <button
          type="button"
          aria-label={t('month.prev')}
          onClick={() => {
            const prev = step(year, month, -1);
            onChange(prev.year, prev.month);
          }}
          className={arrowClass}
        >
          ◀
        </button>
        <select
          aria-label={t('table.month')}
          value={month}
          onChange={(e) => onChange(year, Number(e.target.value))}
          className={selectClass}
        >
          {monthNames.map((name, i) => (
            <option key={i} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label={t('table.year')}
          value={year}
          onChange={(e) => onChange(Number(e.target.value), month)}
          className={selectClass}
        >
          {yearOptions(year).map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label={t('month.next')}
          onClick={() => {
            const next = step(year, month, 1);
            onChange(next.year, next.month);
          }}
          className={arrowClass}
        >
          ▶
        </button>
      </div>
    </div>
  );
}
