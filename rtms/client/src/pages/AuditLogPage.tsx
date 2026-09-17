import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TopScrollContainer } from '@/components/ui/top-scroll';
import { formatDateTime } from '@/lib/utils';
import { getPhilippineDate } from '@/lib/date';
import api from '@/lib/api';

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

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  useEffect(() => {
    const fetchLogs = async () => {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      try {
        const { data } = await api.get('/audit-logs', { params });
        setLogs(data.logs);
        setTotal(data.total);
      } catch (error) {
        console.error('Failed to load audit logs:', error);
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={showingToday ? 'default' : 'outline'}
                  onClick={showToday}
                >
                  Today
                </Button>
                <Button
                  variant={!startDate && !endDate ? 'default' : 'outline'}
                  onClick={showAll}
                >
                  All Dates
                </Button>
              </div>
            </div>

            <Badge variant="secondary" className="self-start sm:self-end text-sm">
              Total logs: {total}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <TopScrollContainer>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Timestamp</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Action</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Previous Status</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">New Status</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Performed By</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b">
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                    <td className="px-3 py-2">{log.action}</td>
                    <td className="px-3 py-2">
                      {log.previousStatus ? <Badge variant="outline">{log.previousStatus}</Badge> : '—'}
                    </td>
                    <td className="px-3 py-2"><Badge variant="outline">{log.newStatus}</Badge></td>
                    <td className="px-3 py-2">{log.performedByName}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                      No audit logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TopScrollContainer>

          {pageCount > 1 && (
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                Page {page} of {pageCount}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
