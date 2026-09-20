import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  SignaturePadComponent,
  type SignaturePadRef,
} from '@/components/transactions/SignaturePad';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { AlertCircle, Check, CheckCircle2, Lock, PenLine, Send, UserX } from 'lucide-react';

interface TabletSession {
  token: string;
  releasedTo: string;
  studentNames: string[];
  count: number;
  status:
    | 'pending'
    | 'signed'
    | 'confirmed'
    | 'cancelled'
    | 'expired';
}

/*
 * Why the tablet cannot be used right now.
 * - locked: the sign page is open on another device.
 * - no_staff: no staff member is currently active.
 */
type Availability = 'ok' | 'locked' | 'no_staff';

const DEVICE_KEY = 'rtams_tablet_device';
const SESSION_POLL_MS = 500;
const UNAVAILABLE_POLL_MS = 3000;

function createDeviceId() {
  // randomUUID needs a secure context; the tablet may use plain HTTP on the LAN.
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function getDeviceId() {
  try {
    const saved = localStorage.getItem(DEVICE_KEY);
    if (saved) return saved;

    const id = createDeviceId();
    localStorage.setItem(DEVICE_KEY, id);
    return id;
  } catch {
    return createDeviceId();
  }
}

export function TabletSignPage() {
  const [deviceId] = useState(getDeviceId);
  const toast = useToast();
  const tablet = { headers: { 'X-Tablet-Device': deviceId } };

  const [availability, setAvailability] =
    useState<Availability>('ok');

  const [session, setSession] =
    useState<TabletSession | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [submitted, setSubmitted] =
    useState(false);

  const [confirmed, setConfirmed] =
    useState(false);

  const [consent, setConsent] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const sigRef =
    useRef<SignaturePadRef>(null);

  // Each new signing session needs its own consent.
  useEffect(() => {
    setConsent(false);
  }, [session?.token]);

  /*
   * Check for the current signing session.
   *
   * The tablet checks frequently so a new signing
   * request appears with very little delay. While the
   * tablet is unavailable it checks less often.
   */
  useEffect(() => {
    if (submitted || confirmed) return;

    let mounted = true;

    const claimDevice = async () => {
      try {
        await api.post('/signing/tablet/claim', null, tablet);
        return true;
      } catch (err: any) {
        if (err.response?.status === 423) {
          return false;
        }

        throw err;
      }
    };

    const checkForSession = async () => {
      try {
        const response = await api.get(
          '/signing/tablet/current',
          tablet
        );

        if (!mounted) return;

        const currentSession =
          response.data.session ?? null;

        setAvailability('ok');
        setError(null);
        setLoading(false);

        if (!currentSession) {
          setSession(null);
          return;
        }

        setSession(currentSession);

        /*
         * If the claimant already submitted the signature
         * before the tablet page refreshed, keep the tablet
         * on the Signature Submitted screen.
         */
        if (currentSession.status === 'signed') {
          setSubmitted(true);
        }
      } catch (err: any) {
        if (!mounted) return;

        const status = err.response?.status;

        if (status === 423) {
          // Not (or no longer) the registered tablet: try to claim it.
          try {
            const claimed = await claimDevice();

            if (!mounted) return;

            if (!claimed) {
              setAvailability('locked');
              setSession(null);
              setLoading(false);
            }
          } catch (claimErr) {
            console.error('Failed to claim tablet', claimErr);
            if (!mounted) return;
            setError('Unable to connect to RTAMS.');
            setLoading(false);
          }
          return;
        }

        if (status === 503) {
          setAvailability('no_staff');
          setSession(null);
          setLoading(false);
          return;
        }

        console.error(
          'Failed to check tablet session',
          err
        );

        // Show the server's reason when there is one; no response means a network failure.
        setError(
          err.response?.data?.error ||
            'Unable to connect to RTAMS.'
        );

        setLoading(false);
      }
    };

    checkForSession();

    const interval = setInterval(
      checkForSession,
      availability === 'ok'
        ? SESSION_POLL_MS
        : UNAVAILABLE_POLL_MS
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
    // `tablet` only wraps the stable deviceId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, confirmed, availability, deviceId]);

  /*
   * Send the current signature drawing to the server.
   *
   * This gives the staff computer a near-live
   * signature preview.
   */
  useEffect(() => {
    if (
      !session ||
      submitted ||
      confirmed
    ) {
      return;
    }

    if (session.status !== 'pending') {
      return;
    }

    const sendProgress = async () => {
      const pad = sigRef.current;

      if (!pad) return;

      try {
        const signature = pad.isEmpty()
          ? ''
          : pad.getDataURL();

        await api.post(
          `/signing/sessions/${session.token}/progress`,
          { signature },
          tablet
        );
      } catch (err) {
        console.error(
          'Failed to send signature progress',
          err
        );
      }
    };

    /*
     * Faster live signature synchronization.
     */
    const interval = setInterval(
      sendProgress,
      250
    );

    return () => {
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, submitted, confirmed, deviceId]);

  /*
   * After staff confirms the signature, show
   * the confirmation message for 3 seconds.
   */
  useEffect(() => {
    if (!confirmed) return;

    const timeout = setTimeout(() => {
      setConfirmed(false);
      setSubmitted(false);
      setSession(null);
      setError(null);
      setLoading(false);
    }, 3000);

    return () => {
      clearTimeout(timeout);
    };
  }, [confirmed]);

  /*
   * After the claimant submits their signature,
   * wait for staff confirmation.
   */
  useEffect(() => {
    if (!submitted || !session) return;

    let mounted = true;

    const checkConfirmation = async () => {
      try {
        const response = await api.get(
          `/signing/tablet/status/${session.token}`,
          tablet
        );

        if (!mounted) return;

        const status =
          response.data.status;

        if (status === 'confirmed') {
          setConfirmed(true);
          return;
        }

        if (
          status === 'cancelled' ||
          status === 'expired'
        ) {
          setSubmitted(false);
          setConfirmed(false);
          setSession(null);

          setError(
            'The tablet signing session has ended.'
          );
        }
      } catch (err) {
        console.error(
          'Failed to check signature confirmation',
          err
        );
      }
    };

    checkConfirmation();

    /*
     * React quickly when staff confirms the release.
     */
    const interval = setInterval(
      checkConfirmation,
      250
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, session, deviceId]);

  /*
   * Submit the final signature from the tablet.
   */
  const handleDone = async () => {
    if (!session) return;

    const pad = sigRef.current;

    if (!pad || pad.isEmpty()) {
      toast.warning(
        'Please provide your signature.'
      );
      return;
    }

    if (!consent) {
      toast.warning(
        'Please confirm your consent to the capture of your signature.'
      );
      return;
    }

    try {
      setError(null);

      const signature =
        pad.getDataURL();

      await api.post(
        `/signing/sessions/${session.token}/sign`,
        {
          signature,
          consent: true,
        },
        tablet
      );

      /*
       * Update the tablet immediately.
       *
       * The tablet does not need to wait for another
       * polling request to show Signature Submitted.
       */
      setSubmitted(true);

      setSession({
        ...session,
        status: 'signed',
      });
    } catch (err: any) {
      console.error(
        'Failed to submit signature',
        err
      );

      setError(
        err.response?.data?.error ||
          'Failed to submit signature.'
      );
    }
  };

  /*
   * Loading screen.
   */
  if (loading) {
    return (
      <StatusScreen icon={<Spinner size="lg" />} title="RTAMS Signature">
        <p className="text-muted-foreground">Connecting to RTAMS…</p>
      </StatusScreen>
    );
  }

  /*
   * The sign page is already open on another device.
   */
  if (availability === 'locked') {
    return (
      <StatusScreen icon={<Lock className="h-8 w-8" />} tone="warning" title="Tablet Already in Use">
        <p className="text-muted-foreground">
          The RTAMS signature page is already open on another device.
        </p>
        <p className="text-sm text-muted-foreground">
          Close it there, or ask Registrar staff to reset the
          tablet from their dashboard.
        </p>
      </StatusScreen>
    );
  }

  /*
   * No staff member is currently active.
   */
  if (availability === 'no_staff') {
    return (
      <StatusScreen icon={<UserX className="h-8 w-8" />} tone="warning" title="Signature Pad Inactive">
        <p className="text-muted-foreground">
          Staff login required.
        </p>
        <p className="text-sm text-muted-foreground">
          This page becomes available again once a Registrar
          staff member is signed in to RTAMS.
        </p>
      </StatusScreen>
    );
  }

  /*
   * Final confirmation after staff confirms
   * the release.
   */
  if (confirmed) {
    return (
      <StatusScreen icon={<CheckCircle2 className="h-9 w-9" />} tone="success" title="Signature Confirmed">
        <p className="text-muted-foreground">
          Your signature has been successfully recorded.
        </p>
        <p className="text-sm text-muted-foreground">
          Please return the tablet to the Registrar staff.
        </p>
      </StatusScreen>
    );
  }

  /*
   * Signature submitted, waiting for staff confirmation.
   */
  if (submitted) {
    return (
      <StatusScreen icon={<Send className="h-8 w-8" />} tone="success" title="Signature Submitted">
        <p className="text-muted-foreground">
          Your signature has been sent to the Registrar staff.
        </p>
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" />
          Please wait for staff confirmation.
        </p>
      </StatusScreen>
    );
  }

  /*
   * No active signing session.
   */
  if (!session) {
    return (
      <StatusScreen icon={<PenLine className="h-8 w-8" />} title="Ready for Signature">
        <p className="text-sm text-muted-foreground">
          Please wait for the Registrar staff to send a
          document for signing.
        </p>

        {error && <ErrorBox message={error} />}
      </StatusScreen>
    );
  }

  /*
   * Active signing session.
   */
  return (
    <div className="paper-texture flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-2xl space-y-6 rounded-xl border border-border/80 bg-card p-5 shadow-lift animate-fade-up sm:p-8">
        <div className="text-center">
          <p className="eyebrow">RTAMS · Signature Required</p>

          <p className="mt-5 text-sm text-muted-foreground">
            Claimant
          </p>

          <p className="font-display text-3xl font-semibold">
            {session.releasedTo}
          </p>

          {session.count > 1 && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p>
                Claiming <span className="font-mono font-semibold text-foreground">{session.count}</span> documents for:
              </p>
              <p className="mt-1 max-h-24 overflow-y-auto">
                {session.studentNames.join('; ')}
              </p>
            </div>
          )}
        </div>

        {error && <ErrorBox message={error} />}

        <div className="space-y-3">
          <label className="text-sm font-medium">
            Please sign below
          </label>

          <div className="rounded-lg border-2 border-dashed border-seal/50 bg-seal/5 p-2">
            {/* Keep the pad without a background color so the saved PNG stays transparent for the BUP logbook. */}
            <SignaturePadComponent ref={sigRef} />
          </div>
        </div>

        <label
          className={cn(
            'flex cursor-pointer items-start gap-3 rounded-md border p-4 text-sm transition-colors',
            consent ? 'border-success/40 bg-success/5' : 'hover:bg-accent/60'
          )}
        >
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[hsl(var(--primary))]"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I agree to the capture and storage of my signature
            as proof of document release, and I consent to the
            processing of my personal information in accordance
            with the Data Privacy Act of 2012 (Republic Act No.
            10173).
          </span>
        </label>

        <Button
          type="button"
          size="lg"
          onClick={handleDone}
          disabled={!consent}
          className="h-14 w-full text-base"
        >
          <Check className="h-5 w-5" />
          Done
        </Button>
      </div>
    </div>
  );
}

function StatusScreen({
  icon,
  title,
  tone = 'default',
  children,
}: {
  icon: ReactNode;
  title: string;
  tone?: 'default' | 'success' | 'warning';
  children: ReactNode;
}) {
  return (
    <div className="paper-texture flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4 text-center animate-fade-up">
        <div
          className={cn(
            'mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full ring-8',
            tone === 'success' && 'bg-success/10 text-success ring-success/5',
            tone === 'warning' && 'bg-warning/10 text-warning ring-warning/5',
            tone === 'default' && 'bg-primary/10 text-primary ring-primary/5'
          )}
        >
          {icon}
        </div>
        <p className="eyebrow">RTAMS Signature</p>
        <h1 className="font-display text-4xl font-semibold">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-left text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
