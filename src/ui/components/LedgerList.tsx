import type { LedgerEntry } from '../types.ts';
import { useI18n } from '../i18n/i18nContext.ts';
import { categoryName } from '../i18n/categoryName.ts';
import { centsToMajor } from '../lib/money.ts';

interface LedgerListProps {
  entries: LedgerEntry[];
  loading: boolean;
  onEdit: (entry: LedgerEntry) => void;
  onDelete: (id: number) => void;
}

function formatAmount(entry: LedgerEntry): string {
  const sign = entry.type === 'expense' ? '−' : '+';
  return `${sign}${centsToMajor(entry.amount).toLocaleString()} ${entry.currency}`;
}

export function LedgerList({ entries, loading, onEdit, onDelete }: LedgerListProps) {
  const { locale, t } = useI18n();

  if (loading) {
    return <p className="py-8 text-center text-sm text-slate-500">{t('list.loading')}</p>;
  }

  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500">{t('list.empty')}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">{t('list.date')}</th>
            <th className="px-4 py-3 font-medium">{t('list.category')}</th>
            <th className="px-4 py-3 font-medium">{t('list.description')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('list.amount')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('list.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{entry.date}</td>
              <td className="px-4 py-3 text-slate-800">{categoryName(entry.category, locale)}</td>
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
                  {t('list.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(entry.id)}
                  className="text-red-600 hover:text-red-800 hover:underline"
                >
                  {t('list.delete')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
