import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { SignDialog } from '@/components/transactions/SignDialog';
import { ReleaseDialog } from '@/components/transactions/ReleaseDialog';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

export function AdminDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ incomplete: 0, unclaimed: 0, todayCompleted: 0, processing: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [signId, setSignId] = useState<string | null>(null);
  const [releaseId, setReleaseId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const [processingRes, signedRes] = await Promise.all([
      api.get('/transactions', { params: { status: 'Processing' } }),
      api.get('/transactions', { params: { status: 'Signed' } }),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayReleasedRes = await api.get('/transactions', {
      params: { status: 'Released', startDate: today, endDate: today },
    });

    setStats({
      processing: processingRes.data.total,
      incomplete: processingRes.data.total + signedRes.data.total,
      unclaimed: signedRes.data.total,
      todayCompleted: todayReleasedRes.data.total,
    });
  }, []);

  const fetchData = useCallback(async () => {
    const params: any = {};
    if (statusFilter) params.status = statusFilter;
    if (dateFilter) {
      params.startDate = dateFilter;
      params.endDate = dateFilter;
    }

    const { data } = await api.get('/transactions', { params });
    setTransactions(data.transactions);
    await fetchStats();
  }, [statusFilter, dateFilter, fetchStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll stats every 30s so admin sees new requests without refresh
  useEffect(() => {
    const interval = setInterval(async () => {
      try { await fetchStats(); } catch { /* silent */ }
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">New Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Incomplete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.incomplete}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unclaimed (Signed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.unclaimed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todayCompleted}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Requests</CardTitle>
          <div className="flex gap-4 mt-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Processing">Processing</option>
              <option value="Signed">Signed</option>
              <option value="Released">Released</option>
            </select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transactions}
            onSign={(id) => setSignId(id)}
            onRelease={(id) => setReleaseId(id)}
            showActions={true}
          />
        </CardContent>
      </Card>

      <SignDialog
        open={!!signId}
        transactionId={signId}
        onClose={() => setSignId(null)}
        onSigned={fetchData}
      />
      <ReleaseDialog
        open={!!releaseId}
        transactionId={releaseId}
        onClose={() => setReleaseId(null)}
        onReleased={fetchData}
      />
    </div>
  );
}
