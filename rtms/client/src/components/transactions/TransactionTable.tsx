import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TopScrollContainer } from '@/components/ui/top-scroll';
import {
  formatDate,
  formatDuration,
  formatShortDateTime,
} from '@/lib/utils';
import { DOCUMENT_TYPES, formatCourseYear } from '@rtams/shared';

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

export interface ReleaseTarget {
  id: string;
  studentName: string;
}

interface Props {
  transactions: Transaction[];
  onSign?: (ids: string[]) => void;
  onRelease?: (targets: ReleaseTarget[]) => void;
  onStartProcessing?: (ids: string[]) => void;
  showActions?: boolean;
  showReviewer?: boolean;
  userRole?: string;
}

const statusVariant = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'secondary' as const;
    case 'Processing':
      return 'warning' as const;
    case 'Ready for Release':
      return 'default' as const;
    case 'Released':
      return 'success' as const;
    default:
      return 'secondary' as const;
  }
};

export function TransactionTable({
  transactions,
  onSign,
  onRelease,
  onStartProcessing,
  showActions = true,
  showReviewer = false,
  userRole,
}: Props) {
  const [viewSig, setViewSig] = useState<{
    signature: string;
    releasedTo: string;
  } | null>(null);

  // Selected transaction id -> status when it was selected.
  const [selected, setSelected] = useState<Map<string, string>>(
    () => new Map()
  );

  const canSign = userRole === 'admin' && !!onSign;
  const selectable =
    showActions && (!!onStartProcessing || canSign || !!onRelease);

  // Drop rows that disappeared or changed status (e.g. after a bulk action).
  useEffect(() => {
    setSelected((current) => {
      if (current.size === 0) return current;

      const statusById = new Map(
        transactions.map((t) => [t._id, t.status])
      );
      const next = new Map(
        [...current].filter(
          ([id, status]) => statusById.get(id) === status
        )
      );

      return next.size === current.size ? current : next;
    });
  }, [transactions]);

  const selectedRows = useMemo(
    () => transactions.filter((t) => selected.has(t._id)),
    [transactions, selected]
  );

  const pendingSelected = selectedRows.filter((t) => t.status === 'Pending');
  const processingSelected = selectedRows.filter((t) => t.status === 'Processing');
  const readySelected = selectedRows.filter((t) => t.status === 'Ready for Release');

  const allSelected =
    transactions.length > 0 &&
    transactions.every((t) => selected.has(t._id));

  const toggleAll = () => {
    setSelected(
      allSelected
        ? new Map()
        : new Map(transactions.map((t) => [t._id, t.status]))
    );
  };

  const toggleOne = (t: Transaction) => {
    setSelected((current) => {
      const next = new Map(current);

      if (next.has(t._id)) {
        next.delete(t._id);
      } else {
        next.set(t._id, t.status);
      }

      return next;
    });
  };

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No transactions found.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {selectable && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>

          {onStartProcessing && pendingSelected.length > 0 && (
            <Button
              size="sm"
              onClick={() =>
                onStartProcessing(pendingSelected.map((t) => t._id))
              }
            >
              Start Processing ({pendingSelected.length})
            </Button>
          )}

          {canSign && processingSelected.length > 0 && (
            <Button
              size="sm"
              onClick={() =>
                onSign!(processingSelected.map((t) => t._id))
              }
            >
              Sign ({processingSelected.length})
            </Button>
          )}

          {onRelease && readySelected.length > 0 && (
            <Button
              size="sm"
              onClick={() =>
                onRelease(
                  readySelected.map((t) => ({
                    id: t._id,
                    studentName: t.studentName,
                  }))
                )
              }
            >
              Release to One Claimant ({readySelected.length})
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Map())}
          >
            Clear
          </Button>
        </div>
      )}

      <TopScrollContainer>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {selectable && (
                <th className="w-8 px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all transactions"
                    className="h-4 w-4 align-middle"
                    checked={allSelected}
                    onChange={toggleAll}
                  />
                </th>
              )}
              <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                Date
              </th>
              <th className="px-3 py-2 text-left font-medium">
                Student
              </th>
              <th className="px-3 py-2 text-left font-medium">
                Program
              </th>
              <th className="px-3 py-2 text-left font-medium">
                Requested Documents/Services
              </th>
              <th className="px-3 py-2 text-left font-medium">
                Status
              </th>
              {showActions && (
                <th className="px-3 py-2 text-left font-medium">
                  Actions
                </th>
              )}
              <th className="px-3 py-2 text-left font-medium">
                Received/Prepared By
              </th>
              {showReviewer && (
                <th className="px-3 py-2 text-left font-medium">
                  Reviewed/Signed By
                </th>
              )}
              <th className="px-3 py-2 text-left font-medium">
                Duration
              </th>
              <th className="px-3 py-2 text-left font-medium">
                Released To
              </th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((t) => {
              const docSummary = DOCUMENT_TYPES
                .filter(
                  (d: string) =>
                    t.requestedDocuments[d] > 0
                )
                .map(
                  (d: string) =>
                    `${d}(${t.requestedDocuments[d]})`
                )
                .join(', ');

              const othersSummary =
                t.othersCount > 0
                  ? `Others: ${t.others}(${t.othersCount})`
                  : '';

              const fullSummary = [
                docSummary,
                othersSummary,
              ]
                .filter(Boolean)
                .join(', ');

              return (
                <tr
                  key={t._id}
                  className="border-b hover:bg-muted/30"
                >
                  {selectable && (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.studentName}`}
                        className="h-4 w-4 align-middle"
                        checked={selected.has(t._id)}
                        onChange={() => toggleOne(t)}
                      />
                    </td>
                  )}

                  <td className="px-3 py-2 whitespace-nowrap text-xs">
                    {formatDate(t.preparedAt)}
                  </td>

                  <td className="px-3 py-2">
                    {t.studentName}
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    {formatCourseYear(t.studentCourse, t.studentYearLevel)}
                  </td>

                  <td className="px-3 py-2 text-xs">
                    {fullSummary}
                  </td>

                  <td className="px-3 py-2">
                    <Badge
                      variant={statusVariant(t.status)}
                      className="whitespace-nowrap"
                    >
                      {t.status}
                    </Badge>
                  </td>

                  {showActions && (
                    <td className="px-3 py-2 whitespace-nowrap space-x-1">
                      {t.status === 'Pending' &&
                        onStartProcessing && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onStartProcessing([t._id])
                            }
                          >
                            Start Processing
                          </Button>
                        )}

                      {t.status === 'Processing' &&
                        canSign && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onSign!([t._id])
                            }
                          >
                            Sign
                          </Button>
                        )}

                      {t.status === 'Ready for Release' &&
                        onRelease && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onRelease([
                                {
                                  id: t._id,
                                  studentName: t.studentName,
                                },
                              ])
                            }
                          >
                            Release
                          </Button>
                        )}

                      {t.status === 'Released' &&
                        t.signature && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setViewSig({
                                signature: t.signature!,
                                releasedTo:
                                  t.releasedTo || '',
                              })
                            }
                          >
                            View Signature
                          </Button>
                        )}
                    </td>
                  )}

                  <td className="px-3 py-2 whitespace-nowrap">
                    {t.preparedByName}

                    <div className="text-xs text-muted-foreground">
                      {formatShortDateTime(t.preparedAt)}
                    </div>
                  </td>

                  {showReviewer && (
                    <td className="px-3 py-2 whitespace-nowrap">
                      {t.reviewedByName || '—'}

                      {t.reviewedAt && (
                        <div className="text-xs text-muted-foreground">
                          {formatShortDateTime(t.reviewedAt)}
                        </div>
                      )}
                    </td>
                  )}

                  <td className="px-3 py-2 whitespace-nowrap">
                    {t.duration
                      ? formatDuration(t.duration)
                      : '—'}
                  </td>

                  <td className="px-3 py-2">
                    {t.releasedTo || '—'}

                    {t.releasedAt && (
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatShortDateTime(t.releasedAt)}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TopScrollContainer>

      <Dialog
        open={!!viewSig}
        onOpenChange={() => setViewSig(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>E-Signature</DialogTitle>
          </DialogHeader>

          {viewSig && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Claimed by:{' '}
                <span className="font-medium text-foreground">
                  {viewSig.releasedTo}
                </span>
              </p>

              <div className="border rounded-md p-2 bg-white">
                <img
                  src={viewSig.signature}
                  alt="E-Signature"
                  className="w-full"
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
