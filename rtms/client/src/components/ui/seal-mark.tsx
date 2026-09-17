import { cn } from '@/lib/utils';

/* The RTAMS monogram: a small ochre-ringed seal. */
export function SealMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-[0.8rem] font-semibold italic text-primary-foreground',
        'ring-2 ring-seal ring-offset-2 ring-offset-background',
        className
      )}
    >
      R
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-display text-lg font-semibold tracking-tight', className)}>
      RTAMS
    </span>
  );
}
