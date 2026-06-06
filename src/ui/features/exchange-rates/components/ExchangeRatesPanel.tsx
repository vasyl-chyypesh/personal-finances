import type { Currency, ExchangeRates } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';

export interface ExchangeRatesPanelProps {
  rates: ExchangeRates;
}

// The pairs worth surfacing: foreign currencies against the UAH base, plus EUR↔USD.
const PAIRS: { from: Currency; to: Currency }[] = [
  { from: 'USD', to: 'UAH' },
  { from: 'EUR', to: 'UAH' },
  { from: 'EUR', to: 'USD' },
];

export function ExchangeRatesPanel({ rates }: ExchangeRatesPanelProps) {
  const { locale, t } = useI18n();

  return (
    <div className="mb-6 rounded-lg border border-line bg-surface p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {t('table.ratesTitle')}
      </h2>
      <div className="flex flex-wrap gap-2">
        {PAIRS.map(({ from, to }) => (
          <span
            key={`${from}-${to}`}
            className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-3 py-1.5 text-sm text-fg-muted"
          >
            <span className="font-medium">1 {from}</span>
            <span className="text-fg-subtle">=</span>
            <span className="font-semibold tabular-nums text-fg">
              {/* eslint-disable-next-line security/detect-object-injection -- from/to are a typed Currency union */}
              {rates[from][to].toLocaleString(locale, { maximumFractionDigits: 4 })}
            </span>
            <span className="font-medium">{to}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
