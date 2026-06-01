import type { LedgerEntry } from '../types.ts';

interface LedgerListProps {
  entries: LedgerEntry[];
  loading: boolean;
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (id: number) => void;
}

function formatAmount(entry: LedgerEntry): string {
  const sign = entry.type === 'expense' ? '−' : '+';
  return `${sign}${entry.amount.toLocaleString()} ${entry.currency}`;
}

export function LedgerList({ entries, loading, onEdit, onDelete }: LedgerListProps) {
  if (loading) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading…</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">No entries for this period yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{entry.date}</td>
              <td className="px-4 py-3 capitalize text-slate-800">{entry.category.name}</td>
              <td className="px-4 py-3 text-slate-500">{entry.description ?? '—'}</td>
              <td
                className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                  entry.type === 'expense' ? 'text-red-600' : 'text-green-600'
                }`}
              >
                {formatAmount(entry)}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(entry)}
                  className="mr-3 text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  className="text-red-600 hover:text-red-800 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
