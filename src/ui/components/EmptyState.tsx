import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Composable empty placeholder: icon + heading + subtext + optional action. */
export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 px-6 py-12 text-center ${className}`}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-pill bg-surface-muted text-fg-subtle">
          {icon}
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-md font-medium text-fg">{title}</p>
        {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
