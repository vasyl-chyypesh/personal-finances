export interface SkeletonRowProps {
  /** 'table' renders a <tr> of cells; 'list' renders a card-like row. */
  variant?: 'table' | 'list';
  /** Number of cells for the table variant. */
  columns?: number;
  className?: string;
}

const bar = 'animate-pulse rounded-sm bg-surface-muted';

/** Loading placeholder for table and list views. */
export function SkeletonRow({ variant = 'table', columns = 6, className = '' }: SkeletonRowProps) {
  if (variant === 'list') {
    return (
      <div className={`flex items-center gap-3 px-3 py-3 ${className}`}>
        <div className={`size-9 ${bar}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-3 w-1/3 ${bar}`} />
          <div className={`h-2.5 w-1/4 ${bar}`} />
        </div>
        <div className={`h-3.5 w-20 ${bar}`} />
      </div>
    );
  }

  return (
    <tr className={className}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className={`h-3 ${bar}`} style={{ width: `${50 + ((i * 13) % 40)}%` }} />
        </td>
      ))}
    </tr>
  );
}
