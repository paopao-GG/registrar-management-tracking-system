import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Clock, FileText, Loader } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatTilesProps {
  newRequests: number;
  processing: number;
  readyForRelease: number;
  completed: number;
  isToday: boolean;
  loading?: boolean;
}

interface Tile {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: string;
}

/* The four status counters shown at the top of both dashboards. */
export function StatTiles({
  newRequests,
  processing,
  readyForRelease,
  completed,
  isToday,
  loading = false,
}: StatTilesProps) {
  const tiles: Tile[] = [
    { label: 'New Requests', value: newRequests, icon: FileText, accent: 'text-primary bg-primary/10' },
    { label: 'Processing', value: processing, icon: Loader, accent: 'text-warning bg-warning/10' },
    { label: 'Ready for Release', value: readyForRelease, icon: Clock, accent: 'text-info bg-info/10' },
    {
      label: isToday ? "Today's Completed" : 'Completed',
      value: completed,
      icon: CheckCircle2,
      accent: 'text-success bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
      {tiles.map(({ label, value, icon: Icon, accent }, i) => (
        <div
          key={label}
          className="group relative overflow-hidden rounded-lg border border-border/80 bg-card p-4 shadow-paper transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift md:p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground md:text-sm">{label}</p>
            <span
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-transform group-hover:scale-110',
                accent
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-9 w-16" />
          ) : (
            <p className="tabular mt-2 font-display text-4xl font-semibold leading-none tracking-tight md:text-[2.75rem]">
              {value}
            </p>
          )}
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-seal transition-transform duration-300 group-hover:scale-x-100"
            style={{ transitionDelay: `${i * 20}ms` }}
          />
        </div>
      ))}
    </div>
  );
}

/* Small "live" marker for panels that auto-refresh. */
export function LiveIndicator() {
  return (
    <span
      data-print-hide
      className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2 py-0.5 text-[0.7rem] font-medium text-success"
      title="Refreshes automatically every 5 seconds"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
      </span>
      Live
    </span>
  );
}
