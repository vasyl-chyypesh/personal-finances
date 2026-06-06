import { useEffect, useRef, useState } from 'react';
import type { Category } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';
import { TableSkeleton } from '../../../components/ui/Skeleton.tsx';
import { TextButton } from '../../../components/ui/TextButton.tsx';

export interface CategoryListProps {
  categories: Category[];
  loading: boolean;
  reorderable: boolean;
  onEdit: (category: Category) => void;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onReorder: (ids: number[]) => void;
}

const moveButtonClass =
  'rounded-sm px-1 text-fg-subtle transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-30';

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
  // After a keyboard reorder the moved row re-renders and the button that was
  // pressed may now be disabled at a list boundary, dropping focus to <body>.
  // Remember which category to refocus and restore it once the new order paints.
  const pendingFocus = useRef<{ id: number; dir: 'up' | 'down' } | null>(null);

  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) {
      return;
    }
    pendingFocus.current = null;
    const preferred = document.getElementById(`cat-move-${pending.dir}-${pending.id}`);
    const otherDir = pending.dir === 'up' ? 'down' : 'up';
    const fallback = document.getElementById(`cat-move-${otherDir}-${pending.id}`);
    const target = preferred instanceof HTMLButtonElement && !preferred.disabled ? preferred : fallback;
    if (target instanceof HTMLButtonElement) {
      target.focus();
    }
  }, [categories]);

  if (loading) {
    return <TableSkeleton rows={4} />;
  }

  if (categories.length === 0) {
    return <EmptyState message={t('categories.empty')} />;
  }

  function reorderTo(from: number, to: number) {
    if (to < 0 || to >= categories.length || from === to) {
      return;
    }
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next.map((c) => c.id));
  }

  function moveByKeyboard(index: number, dir: 'up' | 'down') {
    // eslint-disable-next-line security/detect-object-injection -- index is the bounded map index
    pendingFocus.current = { id: categories[index].id, dir };
    reorderTo(index, dir === 'up' ? index - 1 : index + 1);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null) {
      return;
    }
    reorderTo(dragIndex, targetIndex);
    setDragIndex(null);
  }

  // BEFORE: drag-and-drop only (mouse-only, no keyboard path)
  // AFTER: token-driven table + keyboard move up/down buttons alongside drag
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-surface-muted text-xs uppercase text-fg-subtle">
          <tr>
            {reorderable ? <th className="w-16 px-2 py-3" aria-hidden="true" /> : null}
            <th className="px-4 py-3 font-medium">{t('categories.nameEn')}</th>
            <th className="px-4 py-3 font-medium">{t('categories.nameUk')}</th>
            <th className="px-4 py-3 font-medium">{t('categories.slug')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('categories.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {categories.map((category, index) => {
            const deleted = Boolean(category.deletedAt);
            return (
              <tr
                key={category.id}
                draggable={reorderable}
                onDragStart={reorderable ? () => setDragIndex(index) : undefined}
                onDragOver={reorderable ? (e) => e.preventDefault() : undefined}
                onDrop={reorderable ? () => handleDrop(index) : undefined}
                className={`transition-colors duration-150 ${
                  deleted ? 'bg-surface-muted text-fg-subtle' : 'hover:bg-surface-muted'
                } ${dragIndex === index ? 'opacity-50' : ''}`}
              >
                {reorderable ? (
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-1">
                      <span
                        className="cursor-move select-none text-fg-subtle"
                        aria-hidden="true"
                        title={t('categories.dragHint')}
                      >
                        ⠿
                      </span>
                      <span className="flex flex-col leading-none">
                        <button
                          type="button"
                          id={`cat-move-up-${category.id}`}
                          onClick={() => moveByKeyboard(index, 'up')}
                          disabled={index === 0}
                          aria-label={t('categories.moveUp')}
                          className={moveButtonClass}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          id={`cat-move-down-${category.id}`}
                          onClick={() => moveByKeyboard(index, 'down')}
                          disabled={index === categories.length - 1}
                          aria-label={t('categories.moveDown')}
                          className={moveButtonClass}
                        >
                          ▼
                        </button>
                      </span>
                    </div>
                  </td>
                ) : null}
                <td className="px-4 py-3 text-fg">{category.names.en ?? '—'}</td>
                <td className="px-4 py-3 text-fg">{category.names.uk ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-fg-subtle">{category.slug}</td>
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
