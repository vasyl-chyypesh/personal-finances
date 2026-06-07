import { useI18n } from '../i18n/i18nContext.ts';
import { useCurrencies } from '../hooks/useCurrencies.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { CurrencyListItem } from '../components/CurrencyListItem.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { SkeletonRow } from '../components/SkeletonRow.tsx';
import { AlertIcon } from '../components/icons.tsx';

export function CurrenciesPage() {
  const { t } = useI18n();
  const { currencies, base, rates, loading, error } = useCurrencies();

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
        )}
      </div>
    </>
  );
}
