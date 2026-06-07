import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { categoryColor, categoryGlyph } from '../lib/categoryStyle.ts';
import { ConfirmTooltip } from './ConfirmTooltip.tsx';
import { AmountDisplay } from './AmountDisplay.tsx';
import { PencilIcon, TrashIcon } from './icons.tsx';
import type { Category, LocalizedName } from '../types.ts';

export interface CategoryListItemProps {
  category: Category;
  /** Spend in this category, integer cents (optional bar). */
  spent?: number;
  /** Largest spend across the list, for bar scaling. */
  maxSpent?: number;
  /** Currency for the spend amount. */
  currency?: string;
  onRename?: (id: number, names: LocalizedName) => void | Promise<void>;
  onDelete?: (id: number) => void | Promise<void>;
}

export function CategoryListItem({
  category,
  spent,
  maxSpent,
  currency = 'UAH',
  onRename,
  onDelete,
}: CategoryListItemProps) {
  const { t, locale } = useI18n();
  const name = categoryName(category, locale);
  const color = categoryColor(category.slug);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(name);
    setEditing(true);
  };

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) {
      void onRename?.(category.id, { ...category.names, [locale]: trimmed });
    }
    setEditing(false);
  };

  const barPct =
    spent !== undefined && maxSpent && maxSpent > 0
      ? Math.max(2, Math.round((spent / maxSpent) * 100))
      : 0;

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors duration-100 hover:bg-surface-muted">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {categoryGlyph(name)}
      </span>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(false);
              }
            }}
            aria-label={t('categories.edit')}
            className="w-full max-w-xs rounded-sm border-hairline border-primary bg-surface px-2 py-1 text-base text-fg focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary"
          />
        ) : (
          <button
            type="button"
            onClick={onRename ? startEdit : undefined}
            className={`block max-w-full truncate text-left text-base font-medium text-fg ${
              onRename
                ? 'rounded-sm hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary'
                : 'cursor-default'
            }`}
          >
            {name}
          </button>
        )}

        {spent !== undefined ? (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-surface">
              <div
                className="h-full rounded-pill"
                style={{ width: `${barPct}%`, backgroundColor: color }}
              />
            </div>
            <AmountDisplay
              amount={spent}
              currency={currency}
              type="neutral"
              size="sm"
              showSign={false}
              showCode={false}
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1">
        {onRename ? (
          <button
            type="button"
            aria-label={t('categories.edit')}
            onClick={startEdit}
            className="flex size-7 items-center justify-center rounded-md text-fg-subtle transition-colors duration-100 hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <PencilIcon size={15} />
          </button>
        ) : null}
        {onDelete ? (
          <div className="relative">
            <button
              type="button"
              aria-label={t('categories.delete')}
              onClick={() => setConfirming(true)}
              className="flex size-7 items-center justify-center rounded-md text-fg-subtle transition-colors duration-100 hover:bg-surface hover:text-expense-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
            >
              <TrashIcon size={15} />
            </button>
            <ConfirmTooltip
              open={confirming}
              message={t('categories.deleteConfirm')}
              onConfirm={() => {
                setConfirming(false);
                void onDelete(category.id);
              }}
              onCancel={() => setConfirming(false)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
