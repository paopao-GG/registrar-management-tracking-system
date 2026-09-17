import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { inputClasses } from './input';

interface NativeSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /* Renders the shorter h-9 variant used in filter bars. */
  compact?: boolean;
}

/*
 * Native <select> styled to match Input. `className` sizes the wrapper
 * (e.g. "w-full sm:w-44"); the select always fills it.
 */
export const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, compact, children, ...props }, ref) => (
    <div className={cn('relative w-full', className)}>
      <select
        ref={ref}
        className={cn(inputClasses, 'cursor-pointer appearance-none pr-9', compact && 'h-9 py-1.5')}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
);
NativeSelect.displayName = 'NativeSelect';
