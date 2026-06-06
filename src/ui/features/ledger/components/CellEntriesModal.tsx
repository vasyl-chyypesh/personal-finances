import type { Category, CreateLedgerEntryDto, LedgerEntry, LedgerEntryType } from '../../../types.ts';
import { LedgerForm } from './LedgerForm.tsx';
import { categoryName } from '../../../i18n/categoryName.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { useEditableList } from '../../../hooks/useEditableList.ts';
import { centsToMajor } from '../../../lib/money.ts';
import { Dialog } from '../../../components/ui/Dialog.tsx';
import { TextButton } from '../../../components/ui/TextButton.tsx';

export interface CellDescriptor {
  type: LedgerEntryType;
  category: Category;
  date: string;
}

export interface CellEntriesModalProps {
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
    <Dialog
      title={t('cell.title', { category: categoryName(cell.category, locale), date: cell.date })}
      closeLabel={t('cell.close')}
      onClose={onClose}
    >
      {entries.length === 0 ? (
        <p className="mb-4 text-sm text-fg-muted">{t('cell.none')}</p>
      ) : (
        <ul className="mb-4 divide-y divide-line rounded-md border border-line">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm tabular-nums text-fg">
                {centsToMajor(entry.amount).toLocaleString(locale)} {entry.currency}
              </span>
              <span className="flex-1 truncate text-sm text-fg-muted">
                {entry.description ?? '—'}
              </span>
              <span className="flex gap-2 whitespace-nowrap text-sm">
                <TextButton onClick={() => setEditing(entry)}>{t('list.edit')}</TextButton>
                <TextButton tone="danger" onClick={() => confirmDelete(entry.id)}>
                  {t('list.delete')}
                </TextButton>
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
    </Dialog>
  );
}
