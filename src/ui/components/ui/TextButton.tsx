import type { ButtonHTMLAttributes } from 'react';

export type TextButtonTone = 'neutral' | 'danger' | 'success';

export interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Color tone for the inline action. */
  tone?: TextButtonTone;
}

function toneClass(tone: TextButtonTone): string {
  switch (tone) {
    case 'neutral':
      return 'text-fg-muted hover:text-fg';
    case 'danger':
      return 'text-error hover:text-error-strong';
    case 'success':
      return 'text-success hover:text-success-strong';
  }
}

// AFTER: token tones + focus-visible ring so keyboard users can see the target
const BASE =
  'rounded-sm text-sm transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:ring-offset-surface';

/** Inline, link-style button for compact row actions (edit / delete / restore). */
export function TextButton({ tone = 'neutral', type = 'button', className = '', ...rest }: TextButtonProps) {
  return <button type={type} className={`${BASE} ${toneClass(tone)} ${className}`} {...rest} />;
}
