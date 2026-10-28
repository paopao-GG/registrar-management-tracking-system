import { useEffect, useRef, useState, type FormEvent } from 'react';
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
import { AlertTriangle, CheckCircle2, FileText, PackageCheck, Smartphone } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { isRequestorName } from '@rtams/shared';
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
  // Staff checked the authorization letter of a non-requestor claimant.
  const [authorized, setAuthorized] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionListRef = useRef<HTMLDivElement>(null);

  const [sendingToDevice, setSendingToDevice] =
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
   * Someone other than the students on this release needs an
   * authorization letter.
   */
  const needsAuthorization =
    !!releasedTo.trim() && !isRequestorName(releasedTo, studentNames);
  const authorizationMissing = needsAuthorization && !authorized;

  /*
   * Reset the dialog whenever it opens for new transactions.
   */
  useEffect(() => {
    if (open) {
      setReleasedTo('');
      setAuthorized(false);
      setDocumentsOpen(false);
      setSuggestions([]);
      setSendingToDevice(false);
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
          setSendingToDevice(false);
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
          setSendingToDevice(false);
          setSignatureReceived(false);
          setSignature(null);
          setLiveSignature(null);

          toast.info(
            'The signing session has ended.'
          );
        }
      } catch (err) {
        console.error(
          'Failed to check signing session',
          err
        );
      }
    };

    /*
     * Check again 200 ms after each answer, so the staff screen reacts
     * almost immediately after the claimant taps Done. Waiting for the
     * answer keeps a slow server from piling up checks, which used to
     * queue a Cancel Signing behind them.
     */
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      await checkSession();
      if (mounted) timer = setTimeout(poll, 200);
    };

    poll();

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [sessionId]);

  /*
   * Send the claimant's name and transactions to the sign device.
   */
  const handleSendToDevice = async () => {
    if (count === 0) return;

    if (!releasedTo.trim()) {
      toast.warning('Please enter the claimant name');
      return;
    }

    if (authorizationMissing) {
      toast.warning('Please check the authorization letter first.');
      return;
    }

    setSendingToDevice(true);
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
      setSendingToDevice(false);

      toast.error(
        err.response?.data?.error ||
          'Failed to send the document to the sign device.'
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

    if (authorizationMissing) {
      toast.warning('Please check the authorization letter first.');
      return;
    }

    if (!signatureReceived || !signature) {
      toast.warning(
        'Please have the claimant sign first.'
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Release every transaction with the one claimant
       * signature. Passing the session also confirms it,
       * which tells the sign device in the same commit.
       */
      await api.post('/transactions/bulk/release', {
        ids: transactionIds,
        releasedTo: releasedTo.trim(),
        signature,
        authorized: needsAuthorization && authorized,
        sessionId: sessionId ?? undefined,
      });

      setReleasedTo('');
      setSuggestions([]);
      setSessionId(null);
      setSignatureReceived(false);
      setSignature(null);
      setLiveSignature(null);

      toast.success(
        count > 1 ? `${count} documents released` : 'Document released',
        {
          description: needsAuthorization
            ? `Claimed by ${releasedTo.trim()} (Authorized Representative).`
            : `Claimed by ${releasedTo.trim()}.`,
        }
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
   * Cancel signing. The dialog resets straight away, which also stops
   * the polling; the sign device is told in the background.
   */
  const handleCancelSigning = async () => {
    if (!sessionId) return;

    const cancelledId = sessionId;

    setSessionId(null);
    setSendingToDevice(false);
    setSignatureReceived(false);
    setSignature(null);
    setLiveSignature(null);

    try {
      await api.delete(
        `/signing/sessions/${cancelledId}`
      );
    } catch (err) {
      console.error(
        'Failed to cancel signing session',
        err
      );

      toast.error(
        'Could not cancel on the sign device. Use Reset Sign Device if it stays on the signature screen.'
      );
    }
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

  // A new list of suggestions starts with nothing highlighted.
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [suggestions]);

  // Keep the highlighted name in view while moving with the arrow keys.
  useEffect(() => {
    if (highlightedIndex < 0) return;

    suggestionListRef.current
      ?.querySelector(`[data-index="${highlightedIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const handleClaimantKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Escape') {
      setSuggestions([]);
      return;
    }

    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((current) =>
        current < suggestions.length - 1 ? current + 1 : 0
      );
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((current) =>
        current > 0 ? current - 1 : suggestions.length - 1
      );
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSelectSuggestion(
        suggestions[Math.max(highlightedIndex, 0)]
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          if (sessionId) {
            handleCancelSigning();
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

        {/* One request is listed inline; more open in their own window. */}
        {count > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setDocumentsOpen(true)}
            className="w-full"
          >
            <FileText className="h-4 w-4" />
            View documents to claim ({count})
          </Button>
        ) : (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Documents to claim:</p>
            {transactions.map((t) => (
              <p key={t.id} className="mt-1 text-muted-foreground">
                <span className="text-foreground">{t.studentName}</span>
                {t.documents && ` — ${t.documents}`}
              </p>
            ))}
          </div>
        )}

        <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Documents to claim:</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              One claimant signs for all {count} requests.
            </p>
            <ul className="max-h-[60vh] space-y-2 overflow-y-auto text-sm text-muted-foreground">
              {transactions.map((t) => (
                <li key={t.id} className="border-b border-border/60 pb-2 last:border-0">
                  <span className="text-foreground">{t.studentName}</span>
                  {t.documents && ` — ${t.documents}`}
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>

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
                onKeyDown={handleClaimantKeyDown}
                role="combobox"
                aria-expanded={suggestions.length > 0}
                aria-autocomplete="list"
                placeholder="Enter claimer name"
                disabled={
                  sendingToDevice ||
                  signatureReceived
                }
                required
              />

              {suggestions.length > 0 && (
                <div
                  ref={suggestionListRef}
                  role="listbox"
                  className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border bg-card py-1 shadow-float animate-in fade-in-0 slide-in-from-top-1"
                >
                  {suggestions.map((name, index) => (
                    <button
                      key={name}
                      type="button"
                      role="option"
                      data-index={index}
                      aria-selected={highlightedIndex === index}
                      className={cn(
                        'w-full border-l-2 px-3 py-2 text-left text-sm transition-colors',
                        highlightedIndex === index
                          ? 'border-seal bg-seal/10'
                          : 'border-transparent hover:bg-accent'
                      )}
                      onMouseMove={() =>
                        setHighlightedIndex(index)
                      }
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

            {needsAuthorization && (
              <div className="space-y-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm animate-in fade-in-0">
                <p className="flex items-start gap-2 text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  The claimant is not the requestor. An authorization
                  letter is required.
                </p>

                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer accent-[hsl(var(--primary))]"
                    checked={authorized}
                    onChange={(e) => setAuthorized(e.target.checked)}
                    disabled={sendingToDevice || signatureReceived}
                  />
                  Authorization letter received and verified
                </label>
              </div>
            )}
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
                    handleSendToDevice
                  }
                  loading={sendingToDevice}
                  disabled={!releasedTo.trim() || authorizationMissing}
                >
                  {!sendingToDevice && <Smartphone className="h-4 w-4" />}
                  {sendingToDevice
                    ? 'Sending to Sign Device...'
                    : 'Send to Sign Device'}
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
                      the sign device.
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
                      handleCancelSigning
                    }
                    disabled={loading}
                  >
                    Cancel Signing
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
              !signature ||
              authorizationMissing
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
