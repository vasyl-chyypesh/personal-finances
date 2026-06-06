export interface EmptyStateProps {
  /** Friendly message shown when there is nothing to display. */
  message: string;
}

/** Centered placeholder for empty lists and tables. */
export function EmptyState({ message }: EmptyStateProps) {
  return <p className="py-8 text-center text-sm text-slate-500">{message}</p>;
}
