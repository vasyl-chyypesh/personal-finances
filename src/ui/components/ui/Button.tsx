import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual emphasis. `primary` is the filled action; `secondary` is outlined. */
  variant?: ButtonVariant;
}

function variantClass(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return 'bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50';
    case 'secondary':
      return 'border border-slate-300 text-slate-600 hover:bg-slate-100';
  }
}

const BASE =
  'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed';

/** Primary/secondary action button. Defaults to `type="button"` to avoid accidental form submits. */
export function Button({ variant = 'primary', type = 'button', className = '', ...rest }: ButtonProps) {
  return <button type={type} className={`${BASE} ${variantClass(variant)} ${className}`} {...rest} />;
}
