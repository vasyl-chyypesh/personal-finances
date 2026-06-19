import { useI18n } from '../i18n/i18nContext.ts';
import type { LedgerEntryType } from '../types.ts';

/**
 * The backend has no status field (entries are only income/expense), so per the
 * Phase 0 decision the "status" surface maps the entry *type* to a semantic
 * badge. Kept as its own component so a real status model could later replace
 * the mapping without touching call sites.
 */
export interface StatusBadgeProps {
  status: LedgerEntryType;
  className?: string;
}

const TONE: Record<LedgerEntryType, string> = {
  income: 'bg-income-bg text-income-text',
  expense: 'bg-expense-bg text-expense-text',
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const { t } = useI18n();
  // eslint-disable-next-line security/detect-object-injection -- key is a literal union
  const tone = TONE[status];
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-2xs font-medium ${tone} ${className}`}
    >
      {status === 'income' ? t('status.income') : t('status.expense')}
    </span>
  );
}
