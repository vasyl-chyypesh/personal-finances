import { useI18n } from '../i18n/i18nContext.ts';
import { CURRENCY_META } from '../lib/currencyMeta.ts';
import type { Currency } from '../types.ts';

export interface CurrencyListItemProps {
  code: Currency;
  base: Currency;
  /** Units of `code` per 1 unit of `base` (i.e. rates[base][code]). */
  rate: number;
}

const rateFmt = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

/** A currency row: flag + code + full name + rate relative to the base currency. */
export function CurrencyListItem({ code, base, rate }: CurrencyListItemProps) {
  const { t } = useI18n();
  // eslint-disable-next-line security/detect-object-injection -- key is a Currency union
  const meta = CURRENCY_META[code];
  const isBase = code === base;

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 hover:bg-surface-muted">
      <span aria-hidden className="text-lg">
        {meta.flag}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-medium text-fg">{code}</span>
          {isBase ? (
            <span className="rounded-sm border-hairline border-line-strong px-1.5 py-0.5 text-2xs font-medium text-fg-muted">
              {t('currencies.base')}
            </span>
          ) : null}
        </div>
        <p className="truncate text-xs text-fg-muted">{meta.name}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-base text-fg tabular-nums">{rateFmt.format(rate)}</p>
        <p className="text-2xs text-fg-subtle">{t('currencies.rateVsBase', { base })}</p>
      </div>
    </div>
  );
}
