import type { ReactNode } from 'react';

export type AlertTone = 'error';

export interface AlertProps {
  /** Severity tone. Currently only `error` is used. */
  tone?: AlertTone;
  /** Message content. */
  children: ReactNode;
  className?: string;
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0">
      <path d="M12 2 1 21h22L12 2zm0 6 7 12H5l7-12zm-1 4v3h2v-3h-2zm0 4v2h2v-2h-2z" />
    </svg>
  );
}

function toneClass(tone: AlertTone): string {
  switch (tone) {
    case 'error':
      return 'bg-error/10 text-error-strong dark:text-error';
  }
}

/** Inline status banner for surfacing request/validation errors. */
export function Alert({ tone = 'error', children, className = '' }: AlertProps) {
  return (
    <p role="alert" className={`flex items-start gap-2 rounded-md px-4 py-3 text-sm ${toneClass(tone)} ${className}`}>
      <WarningIcon />
      <span>{children}</span>
    </p>
  );
}
