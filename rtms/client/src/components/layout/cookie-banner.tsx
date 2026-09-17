import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'rtams-storage-notice';

function readDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/* Notice about the essential browser storage RTAMS uses. Hidden on the signing tablet. */
export function CookieBanner() {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (dismissed || pathname.startsWith('/sign')) return null;

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* storage unavailable — hide for this session only */
    }
    setDismissed(true);
  };

  return (
    <div
      data-print-hide
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-3 bottom-3 z-[90] animate-slide-up sm:inset-x-auto sm:bottom-5 sm:right-5 sm:max-w-md"
    >
      <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-card p-4 shadow-float">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-seal/15 text-seal">
          <Cookie className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-semibold">Essential storage only</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              RTAMS keeps your sign-in session and theme preference in this browser. No tracking or
              advertising cookies are used.
            </p>
          </div>
          <Button size="sm" onClick={accept}>
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
