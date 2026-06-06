import type { Category, CreateLedgerEntryDto, LedgerEntry, LedgerEntryType } from '../../../types.ts';
import { LedgerForm } from './LedgerForm.tsx';
import { categoryName } from '../../../i18n/categoryName.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { useEditableList } from '../../../hooks/useEditableList.ts';
import { centsToMajor } from '../../../lib/money.ts';

export interface CellDescriptor {
  type: LedgerEntryType;
  category: Category;
  date: string;
}

interface CellEntriesModalProps {
  cell: CellDescriptor;
  entries: LedgerEntry[];
  categories: Category[];
  onCreate: (dto: CreateLedgerEntryDto) => Promise<void>;
  onUpdate: (id: number, dto: CreateLedgerEntryDto) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}

export function CellEntriesModal({
  cell,
  entries,
  categories,
  onCreate,
  onUpdate,
  onDelete,
  onClose,
}: CellEntriesModalProps) {
  const { locale, t } = useI18n();
  const { editing, setEditing, stopEditing, confirmDelete } = useEditableList<LedgerEntry>(
    onDelete,
    t('app.deleteConfirm'),
  );

  async function handleUpdate(id: number, dto: CreateLedgerEntryDto) {
    await onUpdate(id, dto);
    stopEditing();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="mt-10 w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800">
            {t('cell.title', { category: categoryName(cell.category, locale), date: cell.date })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
          >
            {t('cell.close')}
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">{t('cell.none')}</p>
        ) : (
          <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm tabular-nums text-slate-800">
                  {centsToMajor(entry.amount).toLocaleString(locale)} {entry.currency}
                </span>
                <span className="flex-1 truncate text-sm text-slate-500">
                  {entry.description ?? '—'}
                </span>
                <span className="flex gap-2 whitespace-nowrap text-sm">
                  <button
                    type="button"
                    onClick={() => setEditing(entry)}
                    className="text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    {t('list.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmDelete(entry.id)}
                    className="text-red-600 hover:text-red-800 hover:underline"
                  >
                    {t('list.delete')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <LedgerForm
          categories={categories}
          editing={editing}
          onCreate={onCreate}
          onUpdate={handleUpdate}
          onCancelEdit={stopEditing}
          defaults={{ type: cell.type, categoryId: cell.category.id, date: cell.date }}
        />
      </div>
    </div>
  );
}
