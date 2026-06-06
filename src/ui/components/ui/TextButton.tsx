import type { ButtonHTMLAttributes } from 'react';

export type TextButtonTone = 'neutral' | 'danger' | 'success';

export interface TextButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Color tone for the inline action. */
  tone?: TextButtonTone;
}

function toneClass(tone: TextButtonTone): string {
  switch (tone) {
    case 'neutral':
      return 'text-slate-600 hover:text-slate-900';
    case 'danger':
      return 'text-error hover:text-error-strong';
    case 'success':
      return 'text-success hover:text-success-strong';
  }
}

/** Inline, link-style button for compact row actions (edit / delete / restore). */
export function TextButton({ tone = 'neutral', type = 'button', className = '', ...rest }: TextButtonProps) {
  return (
    <button
      type={type}
      className={`text-sm transition-colors hover:underline ${toneClass(tone)} ${className}`}
      {...rest}
    />
  );
}
