import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

interface Props {
  open: boolean;
  transactionId: string | null;
  onClose: () => void;
  onStarted: () => void;
}

export function StartProcessingDialog({ open, transactionId, onClose, onStarted }: Props) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!transactionId) return;
    setLoading(true);
    try {
      await api.patch(`/transactions/${transactionId}/start`);
      onStarted();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to start processing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Processing</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to start processing this request?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleStart} disabled={loading}>
            {loading ? 'Starting...' : 'Start Processing'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
