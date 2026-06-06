import { CURRENCIES, type Currency } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';

export interface CurrencySelectorProps {
  value: Currency;
  onChange: (currency: Currency) => void;
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  const { t } = useI18n();
  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-xs font-medium text-fg-muted">{t('table.currency')}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Currency)}
        className="rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-fg shadow-sm transition-colors duration-150 [color-scheme:light] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:[color-scheme:dark]"
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
