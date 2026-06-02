import { useI18n } from '../i18n/i18nContext.ts';

interface MonthPickerProps {
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
  'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const { locale, t } = useI18n();
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long' });
  const monthNames = Array.from({ length: 12 }, (_, i) =>
    monthFormatter.format(new Date(2020, i, 1)),
  );

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">{t('table.month')}</span>
      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
        <button
          type="button"
          aria-label={t('month.prev')}
          onClick={() => {
            const prev = step(year, month, -1);
            onChange(prev.year, prev.month);
          }}
          className="rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100"
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
          className="rounded-md px-2 py-1.5 text-slate-600 hover:bg-slate-100"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
