import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** Friendly message shown when there is nothing to display. */
  message: string;
  /** Optional custom illustration; defaults to a tray icon. */
  icon?: ReactNode;
}

function TrayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-10 w-10">
      <path
        d="M3 14l2.5-8.5A2 2 0 0 1 7.4 4h9.2a2 2 0 0 1 1.9 1.5L21 14M3 14v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M3 14h5l1.5 2h5L16 14h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// AFTER: illustrated, token-based empty state instead of a bare line of text
export function EmptyState({ message, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="text-fg-subtle">{icon ?? <TrayIcon />}</span>
      <p className="max-w-xs text-sm text-fg-muted">{message}</p>
    </div>
  );
}
