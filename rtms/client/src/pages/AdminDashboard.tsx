import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { SignDialog } from '@/components/transactions/SignDialog';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

export function AdminDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState({ newRequests: 0, incomplete: 0, unclaimed: 0, todayCompleted: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [signId, setSignId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const [pendingRes, processingRes, readyRes] = await Promise.all([
      api.get('/transactions', { params: { status: 'Pending' } }),
      api.get('/transactions', { params: { status: 'Processing' } }),
      api.get('/transactions', { params: { status: 'Ready for Release' } }),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const todayReleasedRes = await api.get('/transactions', {
      params: { status: 'Released', startDate: today, endDate: today },
    });

    setStats({
      newRequests: pendingRes.data.total,
      incomplete: pendingRes.data.total + processingRes.data.total + readyRes.data.total,
      unclaimed: readyRes.data.total,
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
      <h2 className="text-2xl font-bold tracking-tight">Admin Dashboard</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">New Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.newRequests}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Incomplete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.incomplete}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unclaimed (Ready for Release)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.unclaimed}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
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
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full sm:w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Ready for Release">Ready for Release</option>
              <option value="Released">Released</option>
            </select>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-48"
            />
          </div>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={transactions}
            onSign={(id) => setSignId(id)}
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
    </div>
  );
}
