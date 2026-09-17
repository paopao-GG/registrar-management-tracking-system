import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-md bg-muted',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.06] after:to-transparent',
        className
      )}
      {...props}
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

/* Placeholder rows shown while a table's data is loading. */
export function TableSkeleton({ rows = 6, cols = 5, className }: TableSkeletonProps) {
  return (
    <div role="status" aria-label="Loading" className={cn('divide-y divide-border/60', className)}>
      <div className="flex gap-4 bg-muted/40 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3.5">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-4 flex-1"
              style={{ opacity: 1 - r * (0.6 / rows), maxWidth: c === 0 ? '9rem' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
