import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const inputClasses =
  'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-[inset_0_1px_1px_hsl(var(--shadow)/0.04)] ' +
  'transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/80 ' +
  'hover:border-foreground/30 focus-visible:border-seal focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-seal/25 ' +
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20 ' +
  'disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium';

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return <input ref={ref} className={cn(inputClasses, className)} {...props} />;
  }
);
Input.displayName = 'Input';

export { Input };
