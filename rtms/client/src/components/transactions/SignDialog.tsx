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

interface Props {
  open: boolean;
  transactionIds: string[];
  onClose: () => void;
  onSigned: () => void;
}

export function SignDialog({ open, transactionIds, onClose, onSigned }: Props) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const count = transactionIds.length;

  const handleSign = async () => {
    if (count === 0) return;
    setLoading(true);
    try {
      await api.post('/transactions/bulk/sign', { ids: transactionIds });
      onSigned();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to sign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign Document{count > 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            {count > 1
              ? `Are you sure you want to mark these ${count} documents as reviewed and signed?`
              : 'Are you sure you want to mark this document as reviewed and signed?'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSign} loading={loading}>
            {loading ? 'Signing...' : count > 1 ? `Confirm Sign (${count})` : 'Confirm Sign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
