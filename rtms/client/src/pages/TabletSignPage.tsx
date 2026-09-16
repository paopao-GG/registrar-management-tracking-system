import { useEffect, useRef, useState } from 'react';
import {
  SignaturePadComponent,
  type SignaturePadRef,
} from '@/components/transactions/SignaturePad';
import api from '@/lib/api';

interface TabletSession {
  token: string;
  releasedTo: string;
  studentName: string;
  status:
    | 'pending'
    | 'signed'
    | 'confirmed'
    | 'cancelled'
    | 'expired';
}

export function TabletSignPage() {
  const [session, setSession] =
    useState<TabletSession | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [submitted, setSubmitted] =
    useState(false);

  const [confirmed, setConfirmed] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const sigRef =
    useRef<SignaturePadRef>(null);

  /*
   * Check for the current signing session.
   *
   * The tablet checks frequently so a new signing
   * request appears with very little delay.
   */
  useEffect(() => {
    if (submitted || confirmed) return;

    let mounted = true;

    const checkForSession = async () => {
      try {
        const response = await api.get(
          '/signing/tablet/current'
        );

        if (!mounted) return;

        const currentSession =
          response.data.session ?? null;

        if (!currentSession) {
          setSession(null);
          setError(null);
          setLoading(false);
          return;
        }

        setSession(currentSession);
        setError(null);
        setLoading(false);

        /*
         * If the claimant already submitted the signature
         * before the tablet page refreshed, keep the tablet
         * on the Signature Submitted screen.
         */
        if (currentSession.status === 'signed') {
          setSubmitted(true);
        }
      } catch (err) {
        console.error(
          'Failed to check tablet session',
          err
        );

        if (!mounted) return;

        setError(
          'Unable to connect to RTAMS.'
        );

        setLoading(false);
      }
    };

    checkForSession();

    /*
     * Faster session detection.
     */
    const interval = setInterval(
      checkForSession,
      500
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [submitted, confirmed]);

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
          { signature }
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
  }, [session, submitted, confirmed]);

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
          `/signing/tablet/status/${session.token}`
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
  }, [submitted, session]);

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

    try {
      setError(null);

      const signature =
        pad.getDataURL();

      await api.post(
        `/signing/sessions/${session.token}/sign`,
        {
          signature,
        }
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
            <SignaturePadComponent ref={sigRef} />
          </div>
        </div>

        <button
          type="button"
          onClick={handleDone}
          className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Done
        </button>
      </div>
    </div>
  );
}