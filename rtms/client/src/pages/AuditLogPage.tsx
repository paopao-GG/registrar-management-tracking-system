import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import api from '@/lib/api';

interface AuditLog {
  _id: string;
  transactionId: string;
  action: string;
  previousStatus: string | null;
  newStatus: string;
  performedByName: string;
  timestamp: string;
}

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const { data } = await api.get('/audit-logs', { params });
    setLogs(data.logs);
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Audit Log</h2>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Timestamp</th>
                <th className="px-3 py-2 text-left font-medium">Transaction ID</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Previous Status</th>
                <th className="px-3 py-2 text-left font-medium">New Status</th>
                <th className="px-3 py-2 text-left font-medium">Performed By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(log.timestamp)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{log.transactionId.slice(-8)}</td>
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
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
