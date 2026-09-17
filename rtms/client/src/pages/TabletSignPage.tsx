import { useEffect, useRef, useState } from 'react';
import {
  SignaturePadComponent,
  type SignaturePadRef,
} from '@/components/transactions/SignaturePad';
import api from '@/lib/api';

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
  const tablet = { headers: { 'X-Tablet-Device': deviceId } };

  const [session, setSession] =
    useState<TabletSession | null>(null);

  const [availability, setAvailability] =
    useState<Availability>('ok');

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

        setError(
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
      alert(
        'Please provide your signature.'
      );
      return;
    }

    if (!consent) {
      alert(
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
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">
            RTAMS Signature
          </h1>

          <p className="mt-2 text-muted-foreground">
            Connecting to RTAMS...
          </p>
        </div>
      </div>
    );
  }

  /*
   * The sign page is already open on another device.
   */
  if (availability === 'locked') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center space-y-4">
          <h1 className="text-3xl font-semibold">
            Tablet Already in Use
          </h1>

          <p className="text-muted-foreground">
            The RTAMS signature page is already open on another device.
          </p>

          <p className="text-sm text-muted-foreground">
            Close it there, or ask Registrar staff to reset the
            tablet from their dashboard.
          </p>
        </div>
      </div>
    );
  }

  /*
   * No staff member is currently active.
   */
  if (availability === 'no_staff') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center space-y-4">
          <h1 className="text-3xl font-semibold">
            Signing Unavailable
          </h1>

          <p className="text-muted-foreground">
            No Registrar staff is currently active.
          </p>

          <p className="text-sm text-muted-foreground">
            This page will be available again once a staff
            member is logged in.
          </p>
        </div>
      </div>
    );
  }

  /*
   * Final confirmation after staff confirms
   * the release.
   */
  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center space-y-4">
          <div className="text-5xl">
            ✓
          </div>

          <h1 className="text-3xl font-semibold">
            Signature Confirmed
          </h1>

          <p className="text-muted-foreground">
            Your signature has been successfully recorded.
          </p>

          <p className="text-sm text-muted-foreground">
            Please return the tablet to the Registrar staff.
          </p>
        </div>
      </div>
    );
  }

  /*
   * Signature submitted, waiting for staff confirmation.
   */
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center space-y-4">
          <div className="text-5xl">
            ✓
          </div>

          <h1 className="text-3xl font-semibold">
            Signature Submitted
          </h1>

          <p className="text-muted-foreground">
            Your signature has been sent to the Registrar staff.
          </p>

          <p className="text-sm text-muted-foreground">
            Please wait for staff confirmation.
          </p>
        </div>
      </div>
    );
  }

  /*
   * No active signing session.
   */
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center space-y-4">
          <h1 className="text-3xl font-semibold">
            RTAMS Signature
          </h1>

          <p className="text-xl font-medium">
            Ready for Signature
          </p>

          <p className="text-sm text-muted-foreground">
            Please wait for the Registrar staff to send a
            document for signing.
          </p>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  /*
   * Active signing session.
   */
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold">
            Signature Required
          </h1>

          <p className="mt-4 text-sm text-muted-foreground">
            Claimant
          </p>

          <p className="text-2xl font-semibold">
            {session.releasedTo}
          </p>

          {session.count > 1 && (
            <div className="mt-3 text-sm text-muted-foreground">
              <p>
                Claiming {session.count} documents for:
              </p>
              <p className="mt-1 max-h-24 overflow-y-auto">
                {session.studentNames.join('; ')}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="text-sm font-medium">
            Please sign below
          </label>

          <div className="rounded-lg border bg-background p-2">
            {/* Keep the pad without a background color so the saved PNG stays transparent for the BUP logbook. */}
            <SignaturePadComponent ref={sigRef} />
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 shrink-0"
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

        <button
          type="button"
          onClick={handleDone}
          disabled={!consent}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}
