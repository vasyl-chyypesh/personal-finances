import { useState } from 'react';
import type { Category } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';
import { TextButton } from '../../../components/ui/TextButton.tsx';

interface CategoryListProps {
  categories: Category[];
  loading: boolean;
  reorderable: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onReorder: (ids: number[]) => void;
}

export function CategoryList({
  categories,
  loading,
  reorderable,
  onEdit,
  onDelete,
  onRestore,
  onReorder,
}: CategoryListProps) {
  const { t } = useI18n();
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  if (loading) {
    return <EmptyState message={t('categories.loading')} />;
  }

  if (categories.length === 0) {
    return <EmptyState message={t('categories.empty')} />;
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...categories];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    onReorder(next.map((c) => c.id));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            {reorderable ? <th className="w-8 px-2 py-3" aria-hidden="true" /> : null}
            <th className="px-4 py-3 font-medium">{t('categories.nameEn')}</th>
            <th className="px-4 py-3 font-medium">{t('categories.nameUk')}</th>
            <th className="px-4 py-3 font-medium">{t('categories.slug')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('categories.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {categories.map((category, index) => {
            const deleted = Boolean(category.deletedAt);
            return (
              <tr
                key={category.id}
                draggable={reorderable}
                onDragStart={reorderable ? () => setDragIndex(index) : undefined}
                onDragOver={reorderable ? (e) => e.preventDefault() : undefined}
                onDrop={reorderable ? () => handleDrop(index) : undefined}
                className={`${deleted ? 'bg-slate-50 text-slate-400' : 'hover:bg-slate-50'} ${
                  dragIndex === index ? 'opacity-50' : ''
                }`}
              >
                {reorderable ? (
                  <td
                    className="cursor-move select-none px-2 py-3 text-center text-slate-400"
                    aria-label={t('categories.dragHandle')}
                    title={t('categories.dragHint')}
                  >
                    ⠿
                  </td>
                ) : null}
                <td className="px-4 py-3">{category.names.en ?? '—'}</td>
                <td className="px-4 py-3">{category.names.uk ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{category.slug}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {deleted ? (
                    <TextButton tone="success" onClick={() => onRestore(category.id)}>
                      {t('categories.restore')}
                    </TextButton>
                  ) : (
                    <>
                      <TextButton onClick={() => onEdit(category)} className="mr-3">
                        {t('categories.edit')}
                      </TextButton>
                      <TextButton tone="danger" onClick={() => onDelete(category.id)}>
                        {t('categories.delete')}
                      </TextButton>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
