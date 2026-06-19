import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/i18nContext.ts';
import { convertCents } from '../lib/currencyMeta.ts';
import { AmountDisplay } from './AmountDisplay.tsx';
import type { Currency, ExchangeRates, LedgerEntry } from '../types.ts';

export interface SummaryBarProps {
  /** Already filtered to the active period. */
  records: LedgerEntry[];
  base: Currency;
  rates: ExchangeRates | null;
  loading?: boolean;
}

function Cell({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="bg-surface p-4">
      <p className="text-2xs font-medium tracking-wide text-fg-subtle uppercase">{label}</p>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1 text-2xs text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

/**
 * One bordered row, cells split by hairline dividers (2×2 on narrow screens,
 * 1×4 from lg). `gap-px` over a `bg-line` container draws the dividers so they
 * render correctly in both grid layouts.
 */
const ROW =
  'grid grid-cols-2 gap-px overflow-hidden rounded-lg border-hairline border-line bg-line lg:grid-cols-4';

/**
 * Derived headline metrics. All money is summed in integer cents and converted
 * to the base currency via the rates matrix (mixed-currency periods → one
 * comparable number per card). Balance/income/expenses/savings are computed
 * from records — never stored as separate state.
 */
export function SummaryBar({ records, base, rates, loading }: SummaryBarProps) {
  const { t } = useI18n();

  const { income, expenses, balance, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    if (rates) {
      for (const r of records) {
        const cents = convertCents(r.amount, r.currency, base, rates);
        if (r.type === 'income') inc += cents;
        else exp += cents;
      }
    }
    return {
      income: inc,
      expenses: exp,
      balance: inc - exp,
      savingsRate: inc > 0 ? ((inc - exp) / inc) * 100 : 0,
    };
  }, [records, base, rates]);

  const hint = t('summary.inBase', { base });

  if (loading) {
    return (
      <div className={ROW}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface p-4">
            <div className="h-2.5 w-20 animate-pulse rounded-sm bg-surface-muted" />
            <div className="mt-3 h-5 w-28 animate-pulse rounded-sm bg-surface-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={ROW}>
      <Cell label={t('summary.income')} hint={hint}>
        <AmountDisplay amount={income} currency={base} type="income" size="lg" showSign={false} />
      </Cell>
      <Cell label={t('summary.expenses')} hint={hint}>
        <AmountDisplay
          amount={expenses}
          currency={base}
          type="expense"
          size="lg"
          showSign={false}
        />
      </Cell>
      <Cell label={t('summary.balance')} hint={hint}>
        <AmountDisplay
          amount={balance}
          currency={base}
          type={balance < 0 ? 'expense' : 'neutral'}
          size="lg"
          showSign={false}
        />
      </Cell>
      <Cell label={t('summary.savingsRate')}>
        <span
          className={`font-mono text-xl font-medium tabular-nums ${
            savingsRate < 0 ? 'text-expense-text' : 'text-fg'
          }`}
        >
          {savingsRate.toFixed(1)}%
        </span>
      </Cell>
    </div>
  );
}
