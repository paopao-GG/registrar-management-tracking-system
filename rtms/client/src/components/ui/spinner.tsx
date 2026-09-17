import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn(
        'shrink-0 animate-spin',
        { 'h-4 w-4': size === 'sm', 'h-5 w-5': size === 'md', 'h-8 w-8': size === 'lg' },
        className
      )}
    />
  );
}
