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
}

export function TabletSignPage() {
  const [session, setSession] = useState<TabletSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sigRef = useRef<SignaturePadRef>(null);

  /*
   * Look for a new signing session.
   */
  useEffect(() => {
    if (completed) return;

    let mounted = true;

    const checkForSession = async () => {
      try {
        const response = await api.get('/signing/tablet/current');

        if (!mounted) return;

        setSession(response.data.session ?? null);
        setError(null);
        setLoading(false);
      } catch (err) {
        console.error('Failed to check tablet session', err);

        if (!mounted) return;

        setError('Unable to connect to RTAMS.');
        setLoading(false);
      }
    };

    checkForSession();

    const interval = setInterval(checkForSession, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [completed]);

  /*
   * Send the current drawing to the server every 500 ms.
   *
   * An empty signature is also sent when the claimant
   * clears the signature pad. This allows the staff computer
   * to clear its live preview.
   */
  useEffect(() => {
    if (!session || completed) return;

    const sendProgress = async () => {
      const pad = sigRef.current;

      if (!pad) {
        return;
      }

      try {
        const signature = pad.isEmpty()
          ? ''
          : pad.getDataURL();

        await api.post(
          `/signing/sessions/${session.token}/progress`,
          {
            signature,
          }
        );
      } catch (err) {
        console.error('Failed to send signature progress', err);
      }
    };

    const interval = setInterval(sendProgress, 500);

    return () => {
      clearInterval(interval);
    };
  }, [session, completed]);

  const handleDone = async () => {
    if (!session) return;

    const pad = sigRef.current;

    if (!pad || pad.isEmpty()) {
      alert('Please provide your signature.');
      return;
    }

    try {
      setError(null);

      const signature = pad.getDataURL();

      await api.post(
        `/signing/sessions/${session.token}/sign`,
        {
          signature,
        }
      );

      setCompleted(true);
    } catch (err: any) {
      console.error('Failed to submit signature', err);

      setError(
        err.response?.data?.error ||
          'Failed to submit signature.'
      );
    }
  };

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

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center space-y-4">
          <div className="text-5xl">✓</div>

          <h1 className="text-3xl font-semibold">
            Signature Received
          </h1>

          <p className="text-muted-foreground">
            The signature has been sent to the Registrar's
            workstation.
          </p>

          <p className="text-sm text-muted-foreground">
            You may now return the tablet to the staff.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-xl text-center space-y-4">
          <h1 className="text-3xl font-semibold">
            RTAMS Signature
          </h1>

          <p className="text-muted-foreground">
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

        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={handleDone}
            className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}