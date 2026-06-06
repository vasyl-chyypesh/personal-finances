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
      return 'text-red-600 hover:text-red-800';
    case 'success':
      return 'text-green-600 hover:text-green-800';
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
