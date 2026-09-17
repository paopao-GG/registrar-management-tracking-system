import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'default', size = 'default', loading = false, disabled, children, ...props },
    ref
  ) => {
    const isIcon = size === 'icon' || size === 'icon-sm';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          'group/button relative inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium',
          'transition-[transform,box-shadow,background-color,color,border-color] duration-150 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'active:translate-y-0 active:scale-[0.98]',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-primary-foreground shadow-paper hover:-translate-y-px hover:bg-primary/90 hover:shadow-lift':
              variant === 'default',
            'bg-destructive text-destructive-foreground shadow-paper hover:-translate-y-px hover:bg-destructive/90 hover:shadow-lift':
              variant === 'destructive',
            'bg-success text-success-foreground shadow-paper hover:-translate-y-px hover:bg-success/90 hover:shadow-lift':
              variant === 'success',
            'border border-input bg-card shadow-paper hover:-translate-y-px hover:border-foreground/25 hover:bg-accent hover:text-accent-foreground hover:shadow-lift':
              variant === 'outline',
            'bg-secondary text-secondary-foreground hover:bg-secondary/70 hover:shadow-paper':
              variant === 'secondary',
            'text-foreground/80 hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 px-3': size === 'sm',
            'h-11 px-8 text-[0.95rem]': size === 'lg',
            'h-10 w-10': size === 'icon',
            'h-8 w-8': size === 'icon-sm',
          },
          className
        )}
        {...props}
      >
        {loading && <Spinner size="sm" className={cn(!isIcon && '-ml-0.5')} />}
        {isIcon && loading ? null : children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
