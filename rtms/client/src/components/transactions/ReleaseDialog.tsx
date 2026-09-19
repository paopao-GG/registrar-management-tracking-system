import { useEffect, useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { CheckCircle2, PackageCheck, TabletSmartphone } from 'lucide-react';
import api from '@/lib/api';
import type { ReleaseTarget } from './TransactionTable';

interface Props {
  open: boolean;
  transactions: ReleaseTarget[];
  onClose: () => void;
  onReleased: () => void;
}

export function ReleaseDialog({
  open,
  transactions,
  onClose,
  onReleased,
}: Props) {
  const [releasedTo, setReleasedTo] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [sendingToTablet, setSendingToTablet] =
    useState(false);

  const [sessionId, setSessionId] = useState<string | null>(
    null
  );

  const [signatureReceived, setSignatureReceived] =
    useState(false);

  const [signature, setSignature] = useState<string | null>(
    null
  );

  const [liveSignature, setLiveSignature] = useState<
    string | null
  >(null);

  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const transactionIds = transactions.map((t) => t.id);
  const transactionKey = transactionIds.join(',');
  const studentNames = Array.from(
    new Set(transactions.map((t) => t.studentName))
  );
  const count = transactions.length;

  /*
   * Reset the dialog whenever it opens for new transactions.
   */
  useEffect(() => {
    if (open) {
      setReleasedTo('');
      setSuggestions([]);
      setSendingToTablet(false);
      setSessionId(null);
      setSignatureReceived(false);
      setSignature(null);
      setLiveSignature(null);
      setLoading(false);
    }
  }, [open, transactionKey]);

  /*
   * Poll the signing session.
   *
   * The short polling interval makes the staff screen
   * react quickly when the claimant finishes signing.
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
         * Always update the live signature preview.
         */
        setLiveSignature(
          data.liveSignature || null
        );

        /*
         * The claimant has finished signing.
         */
        if (data.status === 'signed') {
          setSignatureReceived(true);

          const finalSignature =
            data.signature ||
            data.liveSignature ||
            null;

          setSignature(finalSignature);
          setLiveSignature(finalSignature);
          setSendingToTablet(false);
        }

        /*
         * These states mean the signing session is no
         * longer available.
         */
        if (
          data.status === 'expired' ||
          data.status === 'cancelled'
        ) {
          setSessionId(null);
          setSendingToTablet(false);
          setSignatureReceived(false);
          setSignature(null);
          setLiveSignature(null);

          toast.info(
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
     * Check every 200 ms so the staff screen reacts
     * almost immediately after the claimant taps Done.
     */
    const interval = setInterval(
      checkSession,
      200
    );

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [sessionId]);

  /*
   * Send the claimant's name and transactions to the tablet.
   */
  const handleSendToTablet = async () => {
    if (count === 0) return;

    if (!releasedTo.trim()) {
      toast.warning('Please enter the claimant name');
      return;
    }

    setSendingToTablet(true);
    setSuggestions([]);

    try {
      const response = await api.post(
        '/signing/sessions',
        {
          transactionIds,
          releasedTo: releasedTo.trim(),
        }
      );

      setSessionId(response.data.sessionId);
      setSignatureReceived(false);
      setSignature(null);
      setLiveSignature(null);
    } catch (err: any) {
      setSendingToTablet(false);

      toast.error(
        err.response?.data?.error ||
          'Failed to send the document to the tablet.'
      );
    }
  };

  /*
   * Confirm the signature and release the transactions.
   */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (count === 0) return;

    if (!releasedTo.trim()) {
      toast.warning('Please enter the claimant name');
      return;
    }

    if (!signatureReceived || !signature) {
      toast.warning(
        'Please have the claimant sign on the tablet first.'
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * First release every transaction with the one
       * claimant signature.
       */
      await api.post('/transactions/bulk/release', {
        ids: transactionIds,
        releasedTo: releasedTo.trim(),
        signature,
      });

      /*
       * Then tell the tablet that staff has confirmed
       * the signature.
       */
      if (sessionId) {
        await api.post(
          `/signing/sessions/${sessionId}/confirm`
        );
      }

      setReleasedTo('');
      setSuggestions([]);
      setSessionId(null);
      setSignatureReceived(false);
      setSignature(null);
      setLiveSignature(null);

      toast.success(
        count > 1 ? `${count} documents released` : 'Document released',
        { description: `Claimed by ${releasedTo.trim()}.` }
      );
      onReleased();
      onClose();
    } catch (err: any) {
      toast.error(
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
   * Student name suggestions.
   *
   * They do NOT automatically fill the field.
   */
  const matchSuggestions = (value: string) => {
    const term = value.trim().toLowerCase();

    setSuggestions(
      term
        ? studentNames.filter((name) =>
            name.toLowerCase().includes(term)
          )
        : []
    );
  };

  const handleSelectSuggestion = (name: string) => {
    setReleasedTo(name);
    setSuggestions([]);
  };

  const handleChange = (value: string) => {
    setReleasedTo(value);
    matchSuggestions(value);
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
          setSuggestions([]);

          onClose();
        }
      }}
    >
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {count > 1
              ? `Release ${count} Documents`
              : 'Release Document'}
          </DialogTitle>
        </DialogHeader>

        {count > 1 && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">
              One claimant will sign for:
            </p>

            <ul className="mt-1 max-h-32 list-disc overflow-y-auto pl-5 text-muted-foreground">
              {studentNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </div>
        )}

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
                onFocus={() =>
                  matchSuggestions(releasedTo)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSuggestions([]);
                  }

                  if (
                    e.key === 'Enter' &&
                    suggestions.length > 0
                  ) {
                    e.preventDefault();
                    handleSelectSuggestion(
                      suggestions[0]
                    );
                  }
                }}
                placeholder="Enter claimer name"
                disabled={
                  sendingToTablet ||
                  signatureReceived
                }
                required
              />

              {suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-card py-1 shadow-float animate-in fade-in-0 slide-in-from-top-1">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                      onClick={() =>
                        handleSelectSuggestion(name)
                      }
                    >
                      <div className="font-medium">
                        {name}
                      </div>
                    </button>
                  ))}
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
                  loading={sendingToTablet}
                  disabled={!releasedTo.trim()}
                >
                  {!sendingToTablet && <TabletSmartphone className="h-4 w-4" />}
                  {sendingToTablet
                    ? 'Sending to Tablet...'
                    : 'Sign on Tablet'}
                </Button>
              )}

            {sessionId &&
              !signatureReceived && (
                <div className="space-y-3 rounded-md border border-seal/40 bg-seal/5 p-4">
                  <div className="text-center">
                    <p className="flex items-center justify-center gap-2 font-medium">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-seal opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-seal" />
                      </span>
                      Waiting for Signature
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      The claimant can sign on
                      the tablet.
                    </p>
                  </div>

                  {/* LIVE SIGNATURE PREVIEW */}
                  <div className="rounded-md border bg-white p-2">
                    {liveSignature ? (
                      <img
                        src={liveSignature}
                        alt="Live signature preview"
                        className="h-40 w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-slate-500">
                        <Spinner size="md" />
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
              <div className="space-y-3 rounded-md border border-success/30 bg-success/5 p-4 animate-in fade-in-0 zoom-in-95">
                <p className="flex items-center justify-center gap-2 font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Signature Received
                </p>

                {signature && (
                  <div className="rounded-md border bg-white p-2">
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
            variant="success"
            size="lg"
            className="w-full"
            loading={loading}
            disabled={
              !signatureReceived ||
              !signature
            }
          >
            {!loading && <PackageCheck className="h-4 w-4" />}
            {loading
              ? 'Releasing...'
              : count > 1
                ? `Confirm Release (${count})`
                : 'Confirm Release'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
