import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

// AFTER: surface/line/fg tokens, dark-aware native controls, teal focus ring
export const controlClass =
  'w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle transition-colors duration-150 [color-scheme:light] focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:[color-scheme:dark]';

/** Text/number/date input styled to match the form control system. */
export function Input({ className = '', ...rest }: InputProps) {
  return <input className={`${controlClass} ${className}`} {...rest} />;
}
