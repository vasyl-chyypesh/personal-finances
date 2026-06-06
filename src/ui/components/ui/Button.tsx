import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. `primary` is the filled action; `secondary` is outlined. */
  variant?: ButtonVariant;
}

function variantClass(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800';
    case 'secondary':
      return 'border border-line-strong bg-surface text-fg-muted hover:bg-surface-muted hover:text-fg active:bg-surface-muted';
  }
}

// AFTER: token-driven colors, 150ms transition, explicit hover/active/focus-visible states
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50';

/** Primary/secondary action button. Defaults to `type="button"` to avoid accidental form submits. */
export function Button({ variant = 'primary', type = 'button', className = '', ...rest }: ButtonProps) {
  return <button type={type} className={`${BASE} ${variantClass(variant)} ${className}`} {...rest} />;
}
