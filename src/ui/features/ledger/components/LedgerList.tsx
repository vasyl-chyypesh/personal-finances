import type { LedgerEntry } from '../../../types.ts';
import { useI18n } from '../../../i18n/i18nContext.ts';
import { categoryName } from '../../../i18n/categoryName.ts';
import { centsToMajor } from '../../../lib/money.ts';
import { EmptyState } from '../../../components/ui/EmptyState.tsx';
import { TableSkeleton } from '../../../components/ui/Skeleton.tsx';
import { TextButton } from '../../../components/ui/TextButton.tsx';

export interface LedgerListProps {
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

  // BEFORE: plain "Loading…" text and a flat slate table
  // AFTER: skeleton loader + token-driven, dark-aware surface table
  if (loading) {
    return <TableSkeleton rows={5} />;
  }

  if (entries.length === 0) {
    return <EmptyState message={t('list.empty')} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-surface-muted text-xs uppercase text-fg-subtle">
          <tr>
            <th className="px-4 py-3 font-medium">{t('list.date')}</th>
            <th className="px-4 py-3 font-medium">{t('list.category')}</th>
            <th className="px-4 py-3 font-medium">{t('list.description')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('list.amount')}</th>
            <th className="px-4 py-3 text-right font-medium">{t('list.actions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entries.map((entry) => (
            <tr key={entry.id} className="transition-colors duration-150 hover:bg-surface-muted">
              <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{entry.date}</td>
              <td className="px-4 py-3 text-fg">{categoryName(entry.category, locale)}</td>
              <td className="px-4 py-3 text-fg-muted">{entry.description ?? '—'}</td>
              <td
                className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                  entry.type === 'expense' ? 'text-error' : 'text-success'
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
