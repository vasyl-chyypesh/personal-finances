import type { LedgerEntry } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { categoryName } from '../../../i18n/categoryName.ts';
import { centsToMajor } from '../../../lib/money.ts';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';
import { TextButton } from '../../../components/ui/TextButton.tsx';

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
    return <EmptyState message={t('list.loading')} />;
  }

  if (entries.length === 0) {
    return <EmptyState message={t('list.empty')} />;
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
                <TextButton onClick={() => onEdit(entry)} className="mr-3">
                  {t('list.edit')}
                </TextButton>
                <TextButton tone="danger" onClick={() => onDelete(entry.id)}>
                  {t('list.delete')}
                </TextButton>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
