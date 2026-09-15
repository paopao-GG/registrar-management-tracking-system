import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

interface Props {
  open: boolean;
  transactionId: string | null;
  studentName: string;
  onClose: () => void;
  onReleased: () => void;
}

export function ReleaseDialog({
  open,
  transactionId,
  studentName,
  onClose,
  onReleased,
}: Props) {
  const [releasedTo, setReleasedTo] = useState('');
  const [showSuggestion, setShowSuggestion] = useState(false);

  const [sendingToTablet, setSendingToTablet] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [signatureReceived, setSignatureReceived] =
    useState(false);

  const [signature, setSignature] = useState<string | null>(
    null
  );

  const [liveSignature, setLiveSignature] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(false);

  /*
   * Reset the dialog whenever it opens for a transaction.
   */
  useEffect(() => {
    if (open) {
      setReleasedTo('');
      setShowSuggestion(false);
      setSendingToTablet(false);
      setSessionId(null);
      setSignatureReceived(false);
      setSignature(null);
      setLiveSignature(null);
      setLoading(false);
    }
  }, [open, transactionId]);

  /*
   * Poll the signing session.
   *
   * This receives the signature while the claimant is
   * still drawing on the tablet.
   */
  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;

    const checkSession = async () => {
      try {
        const response = await api.get(
          `/signing/sessions/${sessionId}`
        );

        if (!mounted) return;

        const data = response.data;

        /*
         * Always update the live preview.
         *
         * If the tablet sends an empty signature after
         * Clear Signature is pressed, this becomes null
         * and the old preview disappears.
         */
        setLiveSignature(data.liveSignature || null);

        if (data.status === 'signed') {
          setSignatureReceived(true);
          setSignature(
            data.signature || data.liveSignature || null
          );
          setLiveSignature(
            data.signature || data.liveSignature || null
          );
          setSendingToTablet(false);
        }

        if (
          data.status === 'expired' ||
          data.status === 'cancelled'
        ) {
          setSessionId(null);
          setSendingToTablet(false);
          setSignatureReceived(false);
          setSignature(null);
          setLiveSignature(null);

          alert(
            'The tablet signing session has ended.'
          );
        }
      } catch (err) {
        console.error(
          'Failed to check signing session',
          err
        );
      }
    };

    checkSession();

    /*
     * 500 ms keeps the preview reasonably live.
     */
    const interval = setInterval(checkSession, 500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  /*
   * Send the claimant's name and transaction to the tablet.
   */
  const handleSendToTablet = async () => {
    if (!transactionId) return;

    if (!releasedTo.trim()) {
      alert('Please enter the claimant name');
      return;
    }

    setSendingToTablet(true);

    try {
      const response = await api.post(
        '/signing/sessions',
        {
          transactionId,
          releasedTo: releasedTo.trim(),
        }
      );

      setSessionId(response.data.sessionId);
      setSignatureReceived(false);
      setSignature(null);
      setLiveSignature(null);
    } catch (err: any) {
      setSendingToTablet(false);

      alert(
        err.response?.data?.error ||
          'Failed to send the document to the tablet.'
      );
    }
  };

  /*
   * Final release.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!transactionId) return;

    if (!releasedTo.trim()) {
      alert('Please enter the claimant name');
      return;
    }

    if (!signatureReceived || !signature) {
      alert(
        'Please have the claimant sign on the tablet first.'
      );
      return;
    }

    setLoading(true);

    try {
      await api.patch(
        `/transactions/${transactionId}/release`,
        {
          releasedTo: releasedTo.trim(),
          signature,
        }
      );

      setReleasedTo('');
      setShowSuggestion(false);
      setSessionId(null);
      setSignatureReceived(false);
      setSignature(null);
      setLiveSignature(null);

      onReleased();
      onClose();
    } catch (err: any) {
      alert(
        err.response?.data?.error ||
          'Failed to release'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Cancel tablet signing.
   */
  const handleCancelTablet = async () => {
    if (!sessionId) return;

    try {
      await api.delete(
        `/signing/sessions/${sessionId}`
      );
    } catch (err) {
      console.error(
        'Failed to cancel tablet session',
        err
      );
    }

    setSessionId(null);
    setSendingToTablet(false);
    setSignatureReceived(false);
    setSignature(null);
    setLiveSignature(null);
  };

  /*
   * Student name suggestion.
   *
   * It does NOT automatically fill the field.
   */
  const handleSelectSuggestion = () => {
    setReleasedTo(studentName);
    setShowSuggestion(false);
  };

  const handleChange = (value: string) => {
    setReleasedTo(value);

    if (studentName && value.trim()) {
      setShowSuggestion(
        studentName
          .toLowerCase()
          .includes(value.trim().toLowerCase())
      );
    } else {
      setShowSuggestion(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          if (sessionId) {
            handleCancelTablet();
          }

          setReleasedTo('');
          setShowSuggestion(false);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Release Document
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* CLAIMED BY */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Claimed By
            </label>

            <div className="relative">
              <Input
                value={releasedTo}
                onChange={(e) =>
                  handleChange(e.target.value)
                }
                onFocus={() => {
                  if (
                    releasedTo.trim() &&
                    studentName
                  ) {
                    setShowSuggestion(
                      studentName
                        .toLowerCase()
                        .includes(
                          releasedTo
                            .trim()
                            .toLowerCase()
                        )
                    );
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowSuggestion(false);
                  }

                  if (
                    e.key === 'Enter' &&
                    showSuggestion &&
                    studentName
                  ) {
                    e.preventDefault();
                    handleSelectSuggestion();
                  }
                }}
                placeholder="Enter claimer name"
                disabled={
                  sendingToTablet ||
                  signatureReceived
                }
                required
              />

              {showSuggestion &&
                studentName && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                      onClick={
                        handleSelectSuggestion
                      }
                    >
                      <div className="font-medium">
                        {studentName}
                      </div>
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* SIGNATURE */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Signature
            </label>

            {!sessionId &&
              !signatureReceived && (
                <Button
                  type="button"
                  className="w-full"
                  onClick={
                    handleSendToTablet
                  }
                  disabled={
                    sendingToTablet ||
                    !releasedTo.trim()
                  }
                >
                  {sendingToTablet
                    ? 'Sending to Tablet...'
                    : 'Sign on Tablet'}
                </Button>
              )}

            {sessionId &&
              !signatureReceived && (
                <div className="space-y-3 rounded-md border p-4">
                  <div className="text-center">
                    <p className="font-medium">
                      Waiting for Signature
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      The claimant can sign on
                      the tablet.
                    </p>
                  </div>

                  {/* LIVE SIGNATURE PREVIEW */}
                  <div className="rounded-md border bg-background p-2">
                    {liveSignature ? (
                      <img
                        src={liveSignature}
                        alt="Live signature preview"
                        className="h-40 w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                        Waiting for the claimant to
                        start signing...
                      </div>
                    )}
                  </div>

                  {liveSignature && (
                    <p className="text-center text-xs text-muted-foreground">
                      Live signature preview
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={
                      handleCancelTablet
                    }
                    disabled={loading}
                  >
                    Cancel Tablet Signing
                  </Button>
                </div>
              )}

            {signatureReceived && (
              <div className="space-y-3 rounded-md border p-4">
                <p className="text-center font-medium">
                  Signature Received
                </p>

                {signature && (
                  <div className="rounded-md border bg-background p-2">
                    <img
                      src={signature}
                      alt="Claimant signature"
                      className="h-40 w-full object-contain"
                    />
                  </div>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  The claimant has finished signing.
                </p>
              </div>
            )}
          </div>

          {/* CONFIRM RELEASE */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              loading ||
              !signatureReceived ||
              !signature
            }
          >
            {loading
              ? 'Releasing...'
              : 'Confirm Release'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}