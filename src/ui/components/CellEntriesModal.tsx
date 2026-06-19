import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { AmountDisplay } from './AmountDisplay.tsx';
import { Button } from './Button.tsx';
import { CloseIcon, PlusIcon } from './icons.tsx';
import type { Category, LedgerEntry } from '../types.ts';

export interface CellEntriesModalProps {
  open: boolean;
  category: Category | null;
  /** ISO date of the clicked cell. */
  date: string | null;
  entries: LedgerEntry[];
  onEdit: (record: LedgerEntry) => void;
  onAdd: () => void;
  onClose: () => void;
}

const prettyDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

/** Lists the entries in one calendar cell (a category on a day); edit one or
 * add a new one prefilled with that category + date. */
export function CellEntriesModal({
  open,
  category,
  date,
  entries,
  onEdit,
  onAdd,
  onClose,
}: CellEntriesModalProps) {
  const { t, locale } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open || !category || !date) return null;

  const title = t('cell.title', {
    category: categoryName(category, locale),
    date: prettyDate.format(new Date(`${date}T00:00:00Z`)),
  });

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/30" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        className="relative flex max-h-[80vh] w-full max-w-sm flex-col rounded-lg border-hairline border-line bg-surface shadow-xl"
      >
        <header className="flex items-center justify-between border-b-hairline border-line px-4 py-3">
          <h2 className="text-base font-medium text-fg">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            aria-label={t('cell.close')}
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors duration-100 hover:bg-surface-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
          >
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {entries.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-fg-muted">{t('cell.none')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onEdit(e)}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left transition-colors duration-100 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                  >
                    <span className="min-w-0 flex-1 truncate text-base text-fg">
                      {e.description?.trim() || categoryName(e.category, locale)}
                    </span>
                    <AmountDisplay
                      amount={e.amount}
                      currency={e.currency}
                      type={e.type}
                      size="sm"
                      align="right"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t-hairline border-line p-3">
          <Button onClick={onAdd} className="w-full">
            <PlusIcon size={16} />
            {t('cell.add')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
