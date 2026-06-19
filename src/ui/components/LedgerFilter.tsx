import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { categoryColor } from '../lib/categoryStyle.ts';
import { PeriodPicker } from './PeriodPicker.tsx';
import { SegmentedControl } from './SegmentedControl.tsx';
import { ChevronDownIcon } from './icons.tsx';
import type { Category } from '../types.ts';

export type TypeFilter = 'all' | 'income' | 'expense';

export interface LedgerFilterProps {
  period: 'week' | 'month';
  onPeriodChange: (p: 'week' | 'month') => void;
  date: Date;
  onDateChange: (d: Date) => void;

  categories: Category[];
  selectedCategoryIds: number[];
  onSelectedCategoriesChange: (ids: number[]) => void;

  typeFilter: TypeFilter;
  onTypeFilterChange: (t: TypeFilter) => void;

  /** Hide the week/month toggle (calendar view is month-only). */
  hideGranularity?: boolean;
}

function TypeToggle({ value, onChange }: { value: TypeFilter; onChange: (t: TypeFilter) => void }) {
  const { t } = useI18n();
  return (
    <SegmentedControl
      ariaLabel={t('filter.all')}
      value={value}
      onChange={onChange}
      options={[
        { value: 'all', label: t('filter.all') },
        { value: 'income', label: t('filter.income') },
        { value: 'expense', label: t('filter.expenses') },
      ]}
    />
  );
}

function CategoryMultiSelect({
  categories,
  selected,
  onChange,
}: {
  categories: Category[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const label =
    selected.length === 0
      ? t('filter.allCategories')
      : t('filter.categoriesSelected', { count: selected.length });

  return (
    <div className="relative" ref={ref} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border-hairline border-line bg-surface px-3 py-1.5 text-xs text-fg transition-colors duration-100 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
      >
        <span>{t('filter.categories')}:</span>
        <span className="font-medium">{label}</span>
        <ChevronDownIcon size={14} className="text-fg-subtle" />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-multiselectable
          className="absolute z-10 mt-1 max-h-64 w-56 overflow-y-auto rounded-md border-hairline border-line bg-surface p-1 shadow-lg"
        >
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 w-full rounded-sm px-2 py-1 text-left text-2xs text-primary hover:bg-surface-muted"
            >
              {t('filter.clear')}
            </button>
          ) : null}
          {categories.map((c) => {
            const checked = selected.includes(c.id);
            return (
              <label
                key={c.id}
                role="option"
                aria-selected={checked}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-fg hover:bg-surface-muted"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(c.id)}
                  className="accent-primary"
                />
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-pill"
                  style={{ backgroundColor: categoryColor(c.slug) }}
                />
                <span className="truncate">{categoryName(c, locale)}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Combined ledger filter bar. All state is controlled by the parent (page → URL). */
export function LedgerFilter({
  period,
  onPeriodChange,
  date,
  onDateChange,
  categories,
  selectedCategoryIds,
  onSelectedCategoriesChange,
  typeFilter,
  onTypeFilterChange,
  hideGranularity,
}: LedgerFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PeriodPicker
        period={period}
        onPeriodChange={onPeriodChange}
        date={date}
        onDateChange={onDateChange}
        hideGranularity={hideGranularity}
      />
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <TypeToggle value={typeFilter} onChange={onTypeFilterChange} />
        <CategoryMultiSelect
          categories={categories}
          selected={selectedCategoryIds}
          onChange={onSelectedCategoriesChange}
        />
      </div>
    </div>
  );
}
