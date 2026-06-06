import type { SelectHTMLAttributes } from 'react';
import { controlClass } from './Input.tsx';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/** Native `<select>` styled to match the form control system. Pass `<option>`s as children. */
export function Select({ className = '', children, ...rest }: SelectProps) {
  return (
    <select className={`${controlClass} ${className}`} {...rest}>
      {children}
    </select>
  );
}
