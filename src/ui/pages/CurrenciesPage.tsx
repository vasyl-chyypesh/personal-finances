import { useI18n } from '../i18n/i18nContext.ts';
import { useCurrencies } from '../hooks/useCurrencies.ts';
import { useRatesHistory } from '../hooks/useRatesHistory.ts';
import { useCurrencyChartParams } from '../hooks/useCurrencyChartParams.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { CurrencyListItem } from '../components/CurrencyListItem.tsx';
import { RateHistoryChart } from '../components/RateHistoryChart.tsx';
import { RangePresets } from '../components/RangePresets.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { SkeletonRow } from '../components/SkeletonRow.tsx';
import { AlertIcon } from '../components/icons.tsx';

export function CurrenciesPage() {
  const { t } = useI18n();
  const { currencies, base, rates, asOf, stale, loading, error } = useCurrencies();
  const { range, from, to, visible, setRange, toggleSeries } = useCurrencyChartParams();
  const { history, loading: historyLoading, error: historyError } = useRatesHistory({ from, to });

  return (
    <>
      <PageHeader title={t('currencies.title')} subtitle={t('currencies.subtitle')} />

      <div className="rounded-lg border-hairline border-line bg-surface p-2">
        {error ? (
          <EmptyState
            icon={<AlertIcon size={22} />}
            title={t('currencies.loadError')}
            description={error}
            action={
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors duration-100 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t('error.retry')}
              </button>
            }
          />
        ) : loading || !base || !rates ? (
          <div>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonRow key={i} variant="list" />
            ))}
          </div>
        ) : (
          <>
            {asOf ? (
              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <p className="text-2xs text-fg-subtle">{t('currencies.asOf', { date: asOf })}</p>
                {stale ? (
                  <span className="rounded-pill bg-pending-bg px-2 py-0.5 text-2xs font-medium text-pending-text">
                    {t('currencies.stale')}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="divide-y divide-line">
              {currencies.map((code) => (
                <CurrencyListItem
                  key={code}
                  code={code}
                  base={base}
                  // eslint-disable-next-line security/detect-object-injection -- base/code are Currency unions
                  rate={rates[base][code]}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 rounded-lg border-hairline border-line bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-fg">{t('currencies.chartTitle')}</h2>
          <RangePresets value={range} onChange={setRange} />
        </div>
        {historyError ? (
          <p className="text-xs text-fg-muted">{historyError}</p>
        ) : historyLoading || !history ? (
          <SkeletonRow variant="list" />
        ) : history.series.length === 0 ? (
          <p className="text-xs text-fg-muted">{t('currencies.chartEmpty')}</p>
        ) : (
          <RateHistoryChart
            series={history.series}
            base={history.base}
            visible={visible}
            onToggle={toggleSeries}
          />
        )}
      </div>
    </>
  );
}
