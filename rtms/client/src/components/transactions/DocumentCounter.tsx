import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function DocumentCounter({ label, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium w-12">{label}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(Math.max(0, value - 1))}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-8 text-center text-sm font-semibold">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(value + 1)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
