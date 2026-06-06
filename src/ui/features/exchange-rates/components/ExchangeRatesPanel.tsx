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
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t('table.ratesTitle')}
      </h2>
      <div className="flex flex-wrap gap-2">
        {PAIRS.map(({ from, to }) => (
          <span
            key={`${from}-${to}`}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700"
          >
            <span className="font-medium">1 {from}</span>
            <span className="text-slate-400">=</span>
            <span className="font-semibold tabular-nums text-slate-900">
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
