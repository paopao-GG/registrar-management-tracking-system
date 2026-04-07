import { useState, useRef, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SignaturePadComponent, type SignaturePadRef } from './SignaturePad';
import api from '@/lib/api';

interface Props {
  open: boolean;
  transactionId: string | null;
  onClose: () => void;
  onReleased: () => void;
}

export function ReleaseDialog({ open, transactionId, onClose, onReleased }: Props) {
  const [releasedTo, setReleasedTo] = useState('');
  const [loading, setLoading] = useState(false);
  const sigRef = useRef<SignaturePadRef>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!transactionId) return;
    if (sigRef.current?.isEmpty()) {
      alert('Please provide a signature');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/transactions/${transactionId}/release`, {
        releasedTo,
        signature: sigRef.current?.getDataURL() || '',
      });
      setReleasedTo('');
      onReleased();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to release');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Release Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Claimed By</label>
            <Input
              value={releasedTo}
              onChange={(e) => setReleasedTo(e.target.value)}
              placeholder="Enter claimer name"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Signature</label>
            <SignaturePadComponent ref={sigRef} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Releasing...' : 'Confirm Release'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
