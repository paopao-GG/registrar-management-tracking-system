import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, formatDateTime, formatDuration } from '@/lib/utils';
import { DOCUMENT_TYPES } from '@rtms/shared';

interface Transaction {
  _id: string;
  studentName: string;
  studentCourse: string;
  studentYearLevel: number;
  requestedDocuments: Record<string, number>;
  others: string;
  othersCount: number;
  status: string;
  preparedByName: string;
  preparedAt: string;
  reviewedByName?: string;
  reviewedAt?: string;
  duration?: number;
  releasedTo?: string;
  releasedAt?: string;
  signature?: string;
}

interface Props {
  transactions: Transaction[];
  onSign?: (id: string) => void;
  onRelease?: (id: string) => void;
  showActions?: boolean;
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'Processing': return 'warning' as const;
    case 'Signed': return 'default' as const;
    case 'Released': return 'success' as const;
    default: return 'secondary' as const;
  }
};

export function TransactionTable({ transactions, onSign, onRelease, showActions = true }: Props) {
  const [viewSig, setViewSig] = useState<{ signature: string; releasedTo: string } | null>(null);

  if (transactions.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No transactions found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Date</th>
            <th className="px-3 py-2 text-left font-medium">Student</th>
            <th className="px-3 py-2 text-left font-medium">Program</th>
            <th className="px-3 py-2 text-left font-medium">Requested Documents/Services</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Received/Prepared By</th>
            <th className="px-3 py-2 text-left font-medium">Reviewed/Signed By</th>
            <th className="px-3 py-2 text-left font-medium">Duration</th>
            <th className="px-3 py-2 text-left font-medium">Released To</th>
            {showActions && <th className="px-3 py-2 text-left font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const docSummary = DOCUMENT_TYPES
              .filter((d: string) => t.requestedDocuments[d] > 0)
              .map((d: string) => `${d}(${t.requestedDocuments[d]})`)
              .join(', ');
            const othersSummary = t.othersCount > 0 ? `Others: ${t.others}(${t.othersCount})` : '';
            const fullSummary = [docSummary, othersSummary].filter(Boolean).join(', ');

            return (
              <tr key={t._id} className="border-b hover:bg-muted/30">
                <td className="px-3 py-2 whitespace-nowrap">{formatDate(t.preparedAt)}</td>
                <td className="px-3 py-2">{t.studentName}</td>
                <td className="px-3 py-2 whitespace-nowrap">{t.studentCourse} - {t.studentYearLevel}</td>
                <td className="px-3 py-2 text-xs">{fullSummary}</td>
                <td className="px-3 py-2">
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {t.preparedByName}
                  <div className="text-xs text-muted-foreground">{formatDateTime(t.preparedAt)}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {t.reviewedByName || '—'}
                  {t.reviewedAt && (
                    <div className="text-xs text-muted-foreground">{formatDateTime(t.reviewedAt)}</div>
                  )}
                </td>
                <td className="px-3 py-2">{t.duration ? formatDuration(t.duration) : '—'}</td>
                <td className="px-3 py-2">
                  {t.releasedTo || '—'}
                  {t.releasedAt && (
                    <div className="text-xs text-muted-foreground">{formatDateTime(t.releasedAt)}</div>
                  )}
                </td>
                {showActions && (
                  <td className="px-3 py-2 space-x-1">
                    {t.status === 'Processing' && onSign && (
                      <Button size="sm" variant="outline" onClick={() => onSign(t._id)}>
                        Sign
                      </Button>
                    )}
                    {t.status === 'Signed' && onRelease && (
                      <Button size="sm" variant="outline" onClick={() => onRelease(t._id)}>
                        Release
                      </Button>
                    )}
                    {t.status === 'Released' && t.signature && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewSig({ signature: t.signature!, releasedTo: t.releasedTo || '' })}
                      >
                        View Signature
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      <Dialog open={!!viewSig} onOpenChange={() => setViewSig(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-Signature</DialogTitle>
          </DialogHeader>
          {viewSig && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Claimed by: <span className="font-medium text-foreground">{viewSig.releasedTo}</span>
              </p>
              <div className="border rounded-md p-2 bg-white">
                <img src={viewSig.signature} alt="E-Signature" className="w-full" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
