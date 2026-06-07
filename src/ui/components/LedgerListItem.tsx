import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { categoryColor, categoryGlyph } from '../lib/categoryStyle.ts';
import { parseISODate } from '../lib/datePeriod.ts';
import { AmountDisplay } from './AmountDisplay.tsx';
import { CategoryBadge } from './CategoryBadge.tsx';
import { PencilIcon } from './icons.tsx';
import type { LedgerEntry } from '../types.ts';

export interface LedgerListItemProps {
  record: LedgerEntry;
  onClick?: (record: LedgerEntry) => void;
  onEdit?: (record: LedgerEntry) => void;
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** A single transaction row for the list view. Click opens the side panel. */
export function LedgerListItem({ record, onClick, onEdit }: LedgerListItemProps) {
  const { t, locale } = useI18n();
  const name = categoryName(record.category, locale);
  const color = categoryColor(record.category.slug);
  const title = record.description?.trim() || name;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(record)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(record);
        }
      }}
      className="group flex cursor-pointer items-center gap-3 rounded-md px-3 py-3 transition-colors duration-100 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
    >
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {categoryGlyph(name)}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-fg">{title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <CategoryBadge category={record.category} bare />
          <span className="text-xs text-fg-subtle tabular-nums">
            {dateFmt.format(parseISODate(record.date))}
          </span>
        </div>
      </div>

      {onEdit ? (
        <button
          type="button"
          aria-label={t('ledger.editRow')}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(record);
          }}
          className="flex size-7 items-center justify-center rounded-md text-fg-subtle opacity-0 transition-opacity duration-100 hover:bg-surface hover:text-fg group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
        >
          <PencilIcon size={15} />
        </button>
      ) : null}

      <AmountDisplay
        amount={record.amount}
        currency={record.currency}
        type={record.type}
        size="md"
        align="right"
      />
    </div>
  );
}
