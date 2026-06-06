import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const controlClass =
  'w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500';

/** Text/number/date input styled to match the form control system. */
export function Input({ className = '', ...rest }: InputProps) {
  return <input className={`${controlClass} ${className}`} {...rest} />;
}
