import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { OTR_FORWARDED_TO } from '@rtams/shared';

interface Props {
  open: boolean;
  transactionIds: string[];
  onClose: () => void;
  onForwarded: () => void;
}

/* OTRs are released at the main campus, so signed ones are forwarded there. */
export function ForwardDialog({ open, transactionIds, onClose, onForwarded }: Props) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const count = transactionIds.length;

  const handleForward = async () => {
    if (count === 0) return;
    setLoading(true);
    try {
      await api.post('/transactions/bulk/forward', { ids: transactionIds });
      onForwarded();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to forward');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Forward to {OTR_FORWARDED_TO}</DialogTitle>
          <DialogDescription>
            {count > 1
              ? `Mark these ${count} OTR requests as forwarded to the ${OTR_FORWARDED_TO.toLowerCase()}?`
              : `Mark this OTR request as forwarded to the ${OTR_FORWARDED_TO.toLowerCase()}?`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleForward} loading={loading}>
            {loading ? 'Forwarding...' : count > 1 ? `Forward (${count})` : 'Forward'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
