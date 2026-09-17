import { useState } from 'react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { TabletSmartphone } from 'lucide-react';

/*
 * Frees the signing-tablet lock so a different device
 * can open the sign page.
 */
export function ResetTabletButton() {
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const confirmed = window.confirm(
      'Reset the signing tablet? The sign page will need to be reopened on the device that should be used for signing.'
    );

    if (!confirmed) return;

    setLoading(true);

    try {
      await api.delete('/signing/tablet/lock');
      alert('Tablet reset. Open the sign page on the signing device.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset the tablet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleReset}
      disabled={loading}
    >
      <TabletSmartphone className="h-4 w-4 mr-2" />
      {loading ? 'Resetting...' : 'Reset Tablet'}
    </Button>
  );
}
