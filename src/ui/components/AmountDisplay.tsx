import { MINOR_UNIT_SCALE } from '../lib/money.ts';

export type AmountType = 'income' | 'expense' | 'transfer' | 'neutral';
export type AmountSize = 'sm' | 'md' | 'lg';

export interface AmountDisplayProps {
  /** Always in minor units (cents). */
  amount: number;
  /** ISO 4217 code, e.g. 'EUR'. */
  currency: string;
  type: AmountType;
  size?: AmountSize;
  /** Show +/− for income/expense. Default true. */
  showSign?: boolean;
  /** Show the ISO code (never just a bare symbol). Default true. */
  showCode?: boolean;
  /** Cell vs card alignment. Default 'left'. */
  align?: 'left' | 'right';
  className?: string;
}

const SIZE_CLASS: Record<AmountSize, string> = {
  sm: 'text-sm',
  md: 'text-md',
  lg: 'text-xl',
};

const COLOR_CLASS: Record<AmountType, string> = {
  income: 'text-income-text',
  expense: 'text-expense-text',
  transfer: 'text-transfer-text',
  neutral: 'text-fg',
};

const MINUS = '−'; // U+2212 MINUS SIGN — never ASCII '-'

// Fixed locale so grouping/decimal separators stay consistent across the app.
const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The single source of truth for rendering any monetary value. Always
 * monospaced, formatted via Intl, colored from semantic tokens.
 */
export function AmountDisplay({
  amount,
  currency,
  type,
  size = 'md',
  showSign = true,
  showCode = true,
  align = 'left',
  className = '',
}: AmountDisplayProps) {
  let sign = '';
  if (type === 'income') {
    sign = showSign ? '+' : '';
  } else if (type === 'expense') {
    sign = showSign ? MINUS : '';
  } else if (amount < 0) {
    // transfer/neutral reflect the intrinsic sign of a negative value.
    sign = MINUS;
  }

  const major = Math.abs(amount) / MINOR_UNIT_SCALE;
  const number = formatter.format(major);

  // eslint-disable-next-line security/detect-object-injection -- keys are literal unions
  const colorClass = COLOR_CLASS[type];
  // eslint-disable-next-line security/detect-object-injection -- keys are literal unions
  const sizeClass = SIZE_CLASS[size];

  return (
    <span
      className={`inline-flex items-baseline gap-1 font-mono font-medium tabular-nums whitespace-nowrap ${sizeClass} ${colorClass} ${
        align === 'right' ? 'justify-end text-right' : 'text-left'
      } ${className}`}
    >
      <span>
        {sign}
        {number}
      </span>
      {showCode ? <span className="text-[0.8em] text-fg-muted">{currency}</span> : null}
    </span>
  );
}
