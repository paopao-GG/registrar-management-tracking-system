import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface Props {
  open: boolean;
  transactionId: string | null;
  onClose: () => void;
  onSigned: () => void;
}

export function SignDialog({ open, transactionId, onClose, onSigned }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSign = async () => {
    if (!transactionId) return;
    setLoading(true);
    try {
      await api.patch(`/transactions/${transactionId}/sign`);
      onSigned();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to sign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign Document</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to mark this document as reviewed and signed?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSign} disabled={loading}>
            {loading ? 'Signing...' : 'Confirm Sign'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
