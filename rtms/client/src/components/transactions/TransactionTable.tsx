import { useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TopScrollContainer } from '@/components/ui/top-scroll';
import { EmptyState } from '@/components/ui/empty-state';
import { FileSearch, PenLine, PackageCheck, Play, X } from 'lucide-react';
import {
  cn,
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

/*
 * Whole days a signed request has been waiting to be claimed.
 * 0 for anything prepared today or already released.
 */
function daysWaiting(t: Transaction) {
  if (t.status !== 'Ready for Release') return 0;

  return Math.max(
    0,
    differenceInCalendarDays(new Date(), new Date(t.preparedAt))
  );
}

export const statusVariant = (status: string) => {
  switch (status) {
    case 'Pending':
      return 'secondary' as const;
    case 'Processing':
      return 'warning' as const;
    case 'Ready for Release':
      return 'info' as const;
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

  // Whether this user has a bulk action for rows in `status`.
  const hasAction = (status: string) =>
    (status === 'Pending' && !!onStartProcessing) ||
    (status === 'Processing' && canSign) ||
    (status === 'Ready for Release' && !!onRelease);

  // Only rows with an action get a checkbox; hide the column when none do.
  const selectable =
    showActions && transactions.some((t) => hasAction(t.status));

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

  // Select-all is offered only once the selection holds a single status.
  const selectedStatuses = new Set(selected.values());
  const selectedStatus =
    selectedStatuses.size === 1 ? [...selectedStatuses][0] : null;

  const sameStatusRows = selectedStatus
    ? transactions.filter((t) => t.status === selectedStatus)
    : [];

  const allSelected =
    sameStatusRows.length > 0 &&
    sameStatusRows.every((t) => selected.has(t._id));

  const toggleAll = () => {
    setSelected(
      allSelected
        ? new Map()
        : new Map(sameStatusRows.map((t) => [t._id, t.status]))
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
      <EmptyState
        icon={FileSearch}
        title="No transactions found"
        hint="Try a different date range or status filter."
      />
    );
  }

  return (
    <div className="space-y-3">
      {selectable && selected.size > 0 && (
        <div
          data-print-hide
          className="flex flex-wrap items-center gap-2 rounded-md border border-seal/40 bg-seal/10 px-3 py-2 animate-in fade-in-0 slide-in-from-top-1"
        >
          <span className="mr-1 flex items-center gap-2 text-sm font-medium">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-seal px-1.5 font-mono text-xs text-seal-foreground">
              {selected.size}
            </span>
            selected
          </span>

          {onStartProcessing && pendingSelected.length > 0 && (
            <Button
              size="sm"
              onClick={() =>
                onStartProcessing(pendingSelected.map((t) => t._id))
              }
            >
              <Play className="h-3.5 w-3.5" />
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
              <PenLine className="h-3.5 w-3.5" />
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
              <PackageCheck className="h-3.5 w-3.5" />
              Release to One Claimant ({readySelected.length})
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Map())}
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}

      <TopScrollContainer>
        <table className="data-table w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/60">
              {selectable && (
                <th className="w-8 px-3 py-2.5 text-left">
                  {selectedStatus && (
                    <input
                      type="checkbox"
                      aria-label={`Select all ${selectedStatus} transactions`}
                      title={`Select all ${selectedStatus}`}
                      className="h-4 w-4 cursor-pointer align-middle accent-[hsl(var(--primary))]"
                      checked={allSelected}
                      onChange={toggleAll}
                    />
                  )}
                </th>
              )}
              <th className="px-3 py-2.5 text-left whitespace-nowrap">
                Date
              </th>
              <th className="px-3 py-2.5 text-left">
                Student
              </th>
              <th className="px-3 py-2.5 text-left">
                Program
              </th>
              <th className="px-3 py-2.5 text-left">
                Requested Documents/Services
              </th>
              <th className="px-3 py-2.5 text-left">
                Status
              </th>
              {showActions && (
                <th className="px-3 py-2.5 text-left">
                  Actions
                </th>
              )}
              <th className="px-3 py-2.5 text-left">
                Received/Prepared By
              </th>
              {showReviewer && (
                <th className="px-3 py-2.5 text-left">
                  Reviewed/Signed By
                </th>
              )}
              <th className="px-3 py-2.5 text-left">
                Duration
              </th>
              <th className="px-3 py-2.5 text-left">
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
                  className={cn(
                    'border-b border-border/60',
                    selected.has(t._id) && 'bg-seal/5'
                  )}
                >
                  {selectable && (
                    <td className="px-3 py-2">
                      {hasAction(t.status) && (
                        <input
                          type="checkbox"
                          aria-label={`Select ${t.studentName}`}
                          className="h-4 w-4 cursor-pointer align-middle accent-[hsl(var(--primary))]"
                          checked={selected.has(t._id)}
                          onChange={() => toggleOne(t)}
                        />
                      )}
                    </td>
                  )}

                  <td className="tabular px-3 py-2 whitespace-nowrap font-mono text-xs">
                    {formatDate(t.preparedAt)}
                    {daysWaiting(t) > 0 && (
                      <span className="mt-0.5 block font-sans text-[0.7rem] font-medium text-warning">
                        {daysWaiting(t)}d waiting
                      </span>
                    )}
                  </td>

                  <td className="px-3 py-2 font-medium">
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
                            <PenLine className="h-3.5 w-3.5" />
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

                  <td className="tabular px-3 py-2 whitespace-nowrap font-mono text-xs">
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
        <DialogContent aria-describedby={undefined}>
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
