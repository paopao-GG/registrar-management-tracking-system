import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function DocumentCounter({ label, value, onChange }: Props) {
  const active = value > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors',
        active ? 'border-seal/50 bg-seal/10' : 'border-transparent'
      )}
    >
      <span className="w-12 text-sm font-medium">{label}</span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`Decrease ${label}`}
        disabled={value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span
        aria-live="polite"
        className={cn(
          'tabular w-8 text-center font-mono text-sm font-semibold',
          !active && 'text-muted-foreground'
        )}
      >
        {value}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`Increase ${label}`}
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
