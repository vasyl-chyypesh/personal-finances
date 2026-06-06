export interface SkeletonProps {
  /** Sizing/utility classes for the shimmer block (width/height/rounding). */
  className?: string;
}

/** A single pulsing placeholder block for loading states. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div aria-hidden="true" className={`animate-pulse rounded-md bg-surface-muted ${className}`} />
  );
}

export interface TableSkeletonProps {
  /** Number of placeholder rows to render. */
  rows?: number;
}

/** A card-framed list of skeleton rows that mirrors a data table while it loads. */
export function TableSkeleton({ rows = 5 }: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}
