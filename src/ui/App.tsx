import { useState } from 'react';
import { PeriodFilter } from './components/PeriodFilter.tsx';
import { LedgerForm } from './components/LedgerForm.tsx';
import { LedgerList } from './components/LedgerList.tsx';
import { useCategories } from './hooks/useCategories.ts';
import { useLedger } from './hooks/useLedger.ts';
import type { CreateLedgerEntryDto, LedgerEntry, Period } from './types.ts';

export default function App() {
  const [period, setPeriod] = useState<Period>('month');
  const [editing, setEditing] = useState<LedgerEntry | null>(null);

  const { categories, error: categoriesError } = useCategories();
  const { result, loading, error, create, update, remove } = useLedger(period);

  async function handleCreate(dto: CreateLedgerEntryDto) {
    await create(dto);
  }

  async function handleUpdate(id: number, dto: CreateLedgerEntryDto) {
    await update(id, dto);
    setEditing(null);
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this entry?')) {
      return;
    }
    if (editing?.id === id) {
      setEditing(null);
    }
    await remove(id);
  }

  const entries = result?.records ?? [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Personal Finances</h1>
          <p className="text-sm text-slate-500">Track your income and expenses.</p>
        </header>

        {categoriesError ? (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {categoriesError}
          </p>
        ) : null}

        <div className="mb-6">
          <LedgerForm
            categories={categories}
            editing={editing}
            onCreate={handleCreate}
            onUpdate={handleUpdate}
            onCancelEdit={() => setEditing(null)}
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

        {error ? (
          <p className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <LedgerList
          entries={entries}
          loading={loading}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
