import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { categoryColor, categoryGlyph } from '../lib/categoryStyle.ts';
import { ConfirmTooltip } from './ConfirmTooltip.tsx';
import { CheckIcon, CloseIcon, PencilIcon, TrashIcon } from './icons.tsx';
import type { Category, LocalizedName } from '../types.ts';

export interface CategoryListItemProps {
  category: Category;
  onRename?: (id: number, names: LocalizedName) => void | Promise<void>;
  onDelete?: (id: number) => void | Promise<void>;
}

const inputClass =
  'w-full rounded-sm border-hairline border-line bg-surface px-2 py-1 text-base text-fg transition-colors duration-100 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary';

/** Build a LocalizedName from the draft, keeping only non-empty translations. */
function collect(en: string, uk: string): LocalizedName {
  const names: LocalizedName = {};
  if (en.trim()) names.en = en.trim();
  if (uk.trim()) names.uk = uk.trim();
  return names;
}

export function CategoryListItem({ category, onRename, onDelete }: CategoryListItemProps) {
  const { t, locale } = useI18n();
  const name = categoryName(category, locale);
  const color = categoryColor(category.slug);

  const [editing, setEditing] = useState(false);
  const [en, setEn] = useState(category.names.en ?? '');
  const [uk, setUk] = useState(category.names.uk ?? '');
  const [confirming, setConfirming] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      firstInputRef.current?.focus();
      firstInputRef.current?.select();
    }
  }, [editing]);

  const startEdit = () => {
    setEn(category.names.en ?? '');
    setUk(category.names.uk ?? '');
    setEditing(true);
  };

  const commit = () => {
    const names = collect(en, uk);
    if (Object.keys(names).length === 0) return; // at least one locale required
    void onRename?.(category.id, names);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className="flex items-center gap-3 rounded-md px-3 py-2.5"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
          }
        }}
      >
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {categoryGlyph(name)}
        </span>

        <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            ref={firstInputRef}
            value={en}
            onChange={(e) => setEn(e.target.value)}
            aria-label={t('categories.nameEn')}
            placeholder={t('categories.nameEn')}
            className={inputClass}
          />
          <input
            value={uk}
            onChange={(e) => setUk(e.target.value)}
            aria-label={t('categories.nameUk')}
            placeholder={t('categories.nameUk')}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t('categories.submitSave')}
            onClick={commit}
            className="flex size-7 items-center justify-center rounded-md text-primary transition-colors duration-100 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <CheckIcon size={16} />
          </button>
          <button
            type="button"
            aria-label={t('categories.cancel')}
            onClick={() => setEditing(false)}
            className="flex size-7 items-center justify-center rounded-md text-fg-subtle transition-colors duration-100 hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>
    );
  }

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
        <p className="truncate text-base font-medium text-fg">{name}</p>
        <p className="truncate text-xs text-fg-subtle">
          {[category.names.en, category.names.uk].filter(Boolean).join(' · ') || category.slug}
        </p>
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
