import type { ReactNode } from 'react';

export type AlertTone = 'error';

export interface AlertProps {
  /** Severity tone. Currently only `error` is used. */
  tone?: AlertTone;
  /** Message content. */
  children: ReactNode;
  className?: string;
}

function toneClass(tone: AlertTone): string {
  switch (tone) {
    case 'error':
      return 'bg-red-50 text-red-700';
  }
}

/** Inline status banner for surfacing request/validation errors. */
export function Alert({ tone = 'error', children, className = '' }: AlertProps) {
  return (
    <p role="alert" className={`rounded-md px-4 py-3 text-sm ${toneClass(tone)} ${className}`}>
      {children}
    </p>
  );
}
