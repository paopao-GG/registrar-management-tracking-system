import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { TopScrollContainer } from '@/components/ui/top-scroll';
import { statusVariant } from '@/components/transactions/TransactionTable';
import { formatDateTime } from '@/lib/utils';
import { getPhilippineDate } from '@/lib/date';
import api from '@/lib/api';
import { ArrowRight, ChevronLeft, ChevronRight, Printer, ScrollText } from 'lucide-react';

interface AuditLog {
  _id: string;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  performedByName: string;
  timestamp: string;
}

const PAGE_SIZE = 50;

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState(getPhilippineDate);
  const [endDate, setEndDate] = useState(getPhilippineDate);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchLogs = async () => {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      setLoading(true);
      try {
        const { data } = await api.get('/audit-logs', { params });
        setLogs(data.logs);
        setTotal(data.total);
      } catch (error) {
        console.error('Failed to load audit logs:', error);
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    };

    fetchLogs();
  }, [startDate, endDate, page]);

  const today = getPhilippineDate();
  const showingToday = startDate === today && endDate === today;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const showToday = () => {
    setStartDate(today);
    setEndDate(today);
  };

  const showAll = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Accountability"
        title="Audit Log"
        description="Every status change, who made it, and when."
        actions={
          <Button variant="outline" onClick={() => window.print()} disabled={logs.length === 0}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div data-print-hide className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="space-y-2">
                <label htmlFor="audit-start" className="text-sm font-medium">Start Date</label>
                <Input id="audit-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label htmlFor="audit-end" className="text-sm font-medium">End Date</label>
                <Input id="audit-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="inline-flex rounded-md border border-input bg-muted/50 p-1">
                <Button
                  size="sm"
                  variant={showingToday ? 'default' : 'ghost'}
                  className="h-8"
                  onClick={showToday}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={!startDate && !endDate ? 'default' : 'ghost'}
                  className="h-8"
                  onClick={showAll}
                >
                  All Dates
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-end">
              {loading && loaded && <Spinner size="sm" className="text-muted-foreground" />}
              <Badge variant="secondary" className="tabular font-mono text-xs">
                Total logs: {total}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-0 sm:px-6">
          {!loaded ? (
            <TableSkeleton cols={5} />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ScrollText}
              title="No audit logs found"
              hint={showingToday ? 'Nothing has changed yet today.' : 'Try widening the date range.'}
            />
          ) : (
            <TopScrollContainer>
              <table className="data-table w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="whitespace-nowrap px-3 py-2.5 text-left">Timestamp</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left">Action</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left">Status Change</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left">Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id} className="border-b border-border/60">
                      <td className="tabular whitespace-nowrap px-3 py-2.5 font-mono text-xs text-muted-foreground">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{log.action}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {log.previousStatus ? (
                            <Badge variant={statusVariant(log.previousStatus)} className="whitespace-nowrap opacity-70">
                              {log.previousStatus}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <Badge variant={statusVariant(log.newStatus)} className="whitespace-nowrap">
                            {log.newStatus}
                          </Badge>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">{log.performedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TopScrollContainer>
          )}

          {pageCount > 1 && (
            <div data-print-hide className="flex items-center justify-between gap-2 border-t border-border/60 px-4 pt-3 text-sm sm:px-0">
              <span className="tabular font-mono text-xs text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
