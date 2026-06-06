import { PERIODS, type Period } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  const { t } = useI18n();
  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
      {PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => onChange(period)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            value === period ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t(`period.${period}`)}
        </button>
      ))}
    </div>
  );
}
