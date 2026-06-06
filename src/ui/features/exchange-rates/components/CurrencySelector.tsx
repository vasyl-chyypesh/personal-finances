import { CURRENCIES, type Currency } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';

interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  const { t } = useI18n();
  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">{t('table.currency')}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Currency)}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
