import { useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { useCategories } from '../hooks/useCategories.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { CategoryListItem } from '../components/CategoryListItem.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { SkeletonRow } from '../components/SkeletonRow.tsx';
import { AlertIcon, PlusIcon, TagIcon } from '../components/icons.tsx';
import type { LocalizedName } from '../types.ts';

const inputClass =
  'w-full rounded-md border-hairline border-line bg-surface px-3 py-2 text-base text-fg transition-colors duration-100 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary';

export function CategoriesPage() {
  const { t } = useI18n();
  const { categories, loading, error, refresh, create, rename, remove } = useCategories();

  const [en, setEn] = useState('');
  const [uk, setUk] = useState('');
  const [adding, setAdding] = useState(false);

  const submitNew = async () => {
    const names: LocalizedName = {};
    if (en.trim()) names.en = en.trim();
    if (uk.trim()) names.uk = uk.trim();
    if (Object.keys(names).length === 0) return; // at least one locale required
    setAdding(true);
    try {
      await create({ names });
      setEn('');
      setUk('');
    } finally {
      setAdding(false);
    }
  };

  const canAdd = Boolean(en.trim() || uk.trim());

  return (
    <>
      <PageHeader title={t('nav.categories')} />

      <div className="rounded-lg border-hairline border-line bg-surface">
        {/* Add form: name + translations */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitNew();
          }}
          className="flex flex-col gap-2 border-b-hairline border-line p-3 sm:flex-row sm:items-end"
        >
          <label className="flex-1">
            <span className="block text-xs font-medium text-fg-muted">
              {t('categories.nameEn')}
            </span>
            <input
              value={en}
              onChange={(e) => setEn(e.target.value)}
              placeholder={t('categories.nameEn')}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="flex-1">
            <span className="block text-xs font-medium text-fg-muted">
              {t('categories.nameUk')}
            </span>
            <input
              value={uk}
              onChange={(e) => setUk(e.target.value)}
              placeholder={t('categories.nameUk')}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            disabled={adding || !canAdd}
            className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white transition-colors duration-100 hover:bg-primary-hover active:bg-primary-active disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PlusIcon size={16} />
            {t('categories.submitAdd')}
          </button>
        </form>

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
                <CategoryListItem key={c.id} category={c} onRename={rename} onDelete={remove} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
