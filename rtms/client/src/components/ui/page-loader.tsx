import { SealMark } from './seal-mark';

/* Full-screen loader shown while the session is being restored. */
export function PageLoader({ label = 'Loading your workspace' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="paper-texture flex h-screen flex-col items-center justify-center gap-5 bg-background"
    >
      <SealMark className="h-12 w-12 animate-pulse text-lg" />
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-border">
        <div className="h-full w-full origin-left animate-progress-indeterminate bg-seal" />
      </div>
      <p className="eyebrow">{label}</p>
    </div>
  );
}
