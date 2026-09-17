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
  onStarted: () => void;
}

export function StartProcessingDialog({ open, transactionIds, onClose, onStarted }: Props) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const count = transactionIds.length;

  const handleStart = async () => {
    if (count === 0) return;
    setLoading(true);
    try {
      await api.post('/transactions/bulk/start', { ids: transactionIds });
      onStarted();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start processing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Processing</DialogTitle>
          <DialogDescription>
            {count > 1
              ? `Are you sure you want to start processing these ${count} requests?`
              : 'Are you sure you want to start processing this request?'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleStart} loading={loading}>
            {loading ? 'Starting...' : count > 1 ? `Start Processing (${count})` : 'Start Processing'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
