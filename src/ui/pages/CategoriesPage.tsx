import { useMemo, useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { useCategories } from '../hooks/useCategories.ts';
import { useLedger } from '../hooks/useLedger.ts';
import { useCurrencies } from '../hooks/useCurrencies.ts';
import { convertCents } from '../lib/currencyMeta.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { CategoryListItem } from '../components/CategoryListItem.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { SkeletonRow } from '../components/SkeletonRow.tsx';
import { AlertIcon, PlusIcon, TagIcon } from '../components/icons.tsx';
import type { Currency } from '../types.ts';

export function CategoriesPage() {
  const { t, locale } = useI18n();
  const { categories, loading, error, refresh, create, rename, remove } = useCategories();
  const { records } = useLedger(new Date().getUTCFullYear());
  const { base, rates } = useCurrencies();
  const baseCurrency: Currency = base ?? 'UAH';

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  // Expense spend per category (this year), converted to the base currency.
  const spentByCategory = useMemo(() => {
    const map = new Map<number, number>();
    if (rates) {
      for (const r of records) {
        if (r.type !== 'expense') continue;
        const cents = convertCents(r.amount, r.currency, baseCurrency, rates);
        map.set(r.category.id, (map.get(r.category.id) ?? 0) + cents);
      }
    }
    return map;
  }, [records, rates, baseCurrency]);

  const maxSpent = useMemo(() => Math.max(0, ...spentByCategory.values()), [spentByCategory]);

  const submitNew = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await create({ names: { [locale]: name } });
      setNewName('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <PageHeader title={t('nav.categories')} />

      <div className="rounded-lg border-hairline border-line bg-surface">
        {/* Add form */}
        <div className="flex items-center gap-2 border-b-hairline border-line p-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void submitNew();
              }
            }}
            placeholder={t('categories.nameEn')}
            className="flex-1 rounded-md border-hairline border-line bg-surface px-3 py-2 text-base text-fg transition-colors duration-100 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary"
          />
          <button
            type="button"
            onClick={() => void submitNew()}
            disabled={adding || !newName.trim()}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors duration-100 hover:bg-primary-hover active:bg-primary-active disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PlusIcon size={16} />
            {t('categories.submitAdd')}
          </button>
        </div>

        <div className="p-2">
          {error ? (
            <EmptyState
              icon={<AlertIcon size={22} />}
              title={t('categories.loadError')}
              description={error}
              action={
                <button
                  type="button"
                  onClick={refresh}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors duration-100 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t('error.retry')}
                </button>
              }
            />
          ) : loading ? (
            <div>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} variant="list" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <EmptyState icon={<TagIcon size={22} />} title={t('categories.empty')} />
          ) : (
            <div className="divide-y divide-line">
              {categories.map((c) => (
                <CategoryListItem
                  key={c.id}
                  category={c}
                  spent={spentByCategory.get(c.id) ?? 0}
                  maxSpent={maxSpent}
                  currency={baseCurrency}
                  onRename={rename}
                  onDelete={remove}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
