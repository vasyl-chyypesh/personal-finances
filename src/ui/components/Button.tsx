import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 disabled:pointer-events-none';

/**
 * Crisp/minimal button system. `primary` is neutral ink (near-black in light,
 * near-white in dark) so the blue accent stays reserved for selection/focus.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-fg text-surface hover:opacity-90 active:opacity-80',
  secondary: 'border-hairline border-line-strong bg-surface text-fg hover:bg-surface-muted',
  ghost: 'text-fg-muted hover:bg-surface-muted hover:text-fg',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3.5 py-2 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  // eslint-disable-next-line security/detect-object-injection -- typed union keys
  const variantClass = VARIANTS[variant];
  // eslint-disable-next-line security/detect-object-injection -- typed union keys
  const sizeClass = SIZES[size];
  return (
    <button
      type={type}
      className={`${BASE} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...rest}
    />
  );
}
