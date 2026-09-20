import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import api from '@/lib/api';
import { TabletSmartphone } from 'lucide-react';

/*
 * Frees the sign-device lock so a different device
 * can open the sign page.
 */
export function ResetTabletButton() {
  const [loading, setLoading] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const handleReset = async () => {
    const confirmed = await confirm({
      title: 'Reset the sign device?',
      description:
        'The sign page will need to be reopened on the device that should be used for signing.',
      confirmText: 'Reset sign device',
      tone: 'destructive',
    });

    if (!confirmed) return;

    setLoading(true);

    try {
      await api.delete('/signing/tablet/lock');
      toast.success('Sign device reset', { description: 'Open the sign page on the signing device.' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset the sign device.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReset}
      loading={loading}
    >
      {!loading && <TabletSmartphone className="h-4 w-4" />}
      {loading ? 'Resetting...' : 'Reset Sign Device'}
    </Button>
  );
}
