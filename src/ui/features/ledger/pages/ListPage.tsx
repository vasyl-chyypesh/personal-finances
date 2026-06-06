import { useState } from 'react';
import { PeriodFilter } from '../components/PeriodFilter.tsx';
import { LedgerForm } from '../components/LedgerForm.tsx';
import { LedgerList } from '../components/LedgerList.tsx';
import { useCategories } from '../../categories/hooks/useCategories.ts';
import { useLedger } from '../hooks/useLedger.ts';
import { useEditableList } from '../../../hooks/useEditableList.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { Alert } from '../../../components/ui/Alert.tsx';
import type { CreateLedgerEntryDto, LedgerEntry, Period } from '../../../types.ts';

export function ListPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<Period>('month');

  const { categories, error: categoriesError } = useCategories();
  const { result, loading, error, create, update, remove } = useLedger(period);
  const { editing, setEditing, stopEditing, confirmDelete } = useEditableList<LedgerEntry>(
    remove,
    t('app.deleteConfirm'),
  );

  async function handleUpdate(id: number, dto: CreateLedgerEntryDto) {
    await update(id, dto);
    stopEditing();
  }

  const entries = result?.records ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      {categoriesError ? <Alert className="mb-4">{categoriesError}</Alert> : null}

      <div className="mb-6">
        <LedgerForm
          categories={categories}
          editing={editing}
          onCreate={create}
          onUpdate={handleUpdate}
          onCancelEdit={stopEditing}
        />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {result ? (
            <span>
              {result.startDate} → {result.endDate}
            </span>
          ) : null}
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {error ? <Alert className="mb-4">{error}</Alert> : null}

      <LedgerList entries={entries} loading={loading} onEdit={setEditing} onDelete={confirmDelete} />
    </div>
  );
}
