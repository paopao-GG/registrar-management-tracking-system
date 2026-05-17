import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NewRequestForm } from '@/components/transactions/NewRequestForm';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { ReleaseDialog } from '@/components/transactions/ReleaseDialog';
import { StartProcessingDialog } from '@/components/transactions/StartProcessingDialog';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { FileText, CheckCircle, Clock, Loader } from 'lucide-react';

export function StaffDashboard() {
  const { user } = useAuth();
  const [todayTransactions, setTodayTransactions] = useState<any[]>([]);
  const [incompleteTransactions, setIncompleteTransactions] = useState<any[]>([]);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [startProcessingId, setStartProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchName, setSearchName] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchName), 300);
    return () => clearTimeout(timer);
  }, [searchName]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const [todayRes, pendingRes, processingRes, readyRes, releasedTodayRes] = await Promise.all([
      api.get('/transactions', {
        params: { preparedBy: user.id, startDate: today, endDate: today },
      }),
      api.get('/transactions', {
        params: { preparedBy: user.id, status: 'Pending' },
      }),
      api.get('/transactions', {
        params: { preparedBy: user.id, status: 'Processing' },
      }),
      api.get('/transactions', {
        params: { preparedBy: user.id, status: 'Ready for Release' },
      }),
      api.get('/transactions', {
        params: { preparedBy: user.id, status: 'Released', startDate: today, endDate: today },
      }),
    ]);

    setTodayTransactions(todayRes.data.transactions);
    setIncompleteTransactions([
      ...pendingRes.data.transactions,
      ...processingRes.data.transactions,
      ...readyRes.data.transactions,
    ]);
    setTodayCompleted(releasedTodayRes.data.transactions.length);
  }, [user]);

  // Re-fetch incomplete with search
  useEffect(() => {
    if (!user) return;
    const fetchIncomplete = async () => {
      const params: any = { preparedBy: user.id };
      if (debouncedSearch) params.search = debouncedSearch;

      const [pendingRes, processingRes, readyRes] = await Promise.all([
        api.get('/transactions', { params: { ...params, status: 'Pending' } }),
        api.get('/transactions', { params: { ...params, status: 'Processing' } }),
        api.get('/transactions', { params: { ...params, status: 'Ready for Release' } }),
      ]);
      setIncompleteTransactions([
        ...pendingRes.data.transactions,
        ...processingRes.data.transactions,
        ...readyRes.data.transactions,
      ]);
    };
    fetchIncomplete();
  }, [user, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const incompleteCount = incompleteTransactions.length;
  const processingCount = incompleteTransactions.filter((t) => t.status === 'Processing').length;
  const unclaimedCount = incompleteTransactions.filter((t) => t.status === 'Ready for Release').length;

  const filteredToday = statusFilter
    ? todayTransactions.filter((t) => t.status === statusFilter)
    : todayTransactions;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Staff Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Processing</p>
                <p className="text-2xl font-bold">{processingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Incomplete</p>
                <p className="text-2xl font-bold">{incompleteCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Today's Completed</p>
                <p className="text-2xl font-bold">{todayCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Unclaimed (Ready for Release)</p>
                <p className="text-2xl font-bold">{unclaimedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <NewRequestForm onCreated={fetchData} />

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg">Today's Requests</CardTitle>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full sm:w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Ready for Release">Ready for Release</option>
              <option value="Released">Released</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={filteredToday}
            onStartProcessing={(id) => setStartProcessingId(id)}
            onRelease={(id) => setReleaseId(id)}
            showActions={true}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-lg">Incomplete / Unclaimed Documents</CardTitle>
            <Input
              className="w-full sm:max-w-xs"
              placeholder="Search by student name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={incompleteTransactions}
            onStartProcessing={(id) => setStartProcessingId(id)}
            onRelease={(id) => setReleaseId(id)}
            showActions={true}
          />
        </CardContent>
      </Card>

      <ReleaseDialog
        open={!!releaseId}
        transactionId={releaseId}
        onClose={() => setReleaseId(null)}
        onReleased={fetchData}
      />
      <StartProcessingDialog
        open={!!startProcessingId}
        transactionId={startProcessingId}
        onClose={() => setStartProcessingId(null)}
        onStarted={fetchData}
      />
    </div>
  );
}
