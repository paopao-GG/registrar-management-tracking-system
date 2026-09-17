import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'border-primary/15 bg-primary/10 text-primary': variant === 'default',
          'border-transparent bg-secondary text-secondary-foreground': variant === 'secondary',
          'border-destructive/20 bg-destructive/10 text-destructive': variant === 'destructive',
          'border-border text-foreground': variant === 'outline',
          'border-success/20 bg-success/10 text-success': variant === 'success',
          'border-warning/25 bg-warning/10 text-warning': variant === 'warning',
          'border-info/20 bg-info/10 text-info': variant === 'info',
        },
        className
      )}
      {...props}
    />
  );
}
