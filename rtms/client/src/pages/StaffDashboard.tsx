import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NewRequestForm } from '@/components/transactions/NewRequestForm';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { ReleaseDialog } from '@/components/transactions/ReleaseDialog';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { FileText, CheckCircle, Clock, Loader } from 'lucide-react';

export function StaffDashboard() {
  const { user } = useAuth();
  const [todayTransactions, setTodayTransactions] = useState<any[]>([]);
  const [incompleteTransactions, setIncompleteTransactions] = useState<any[]>([]);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [releaseId, setReleaseId] = useState<string | null>(null);
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

    const [todayRes, processingRes, signedRes, releasedTodayRes] = await Promise.all([
      api.get('/transactions', {
        params: { preparedBy: user.id, startDate: today, endDate: today },
      }),
      api.get('/transactions', {
        params: { preparedBy: user.id, status: 'Processing' },
      }),
      api.get('/transactions', {
        params: { preparedBy: user.id, status: 'Signed' },
      }),
      api.get('/transactions', {
        params: { preparedBy: user.id, status: 'Released', startDate: today, endDate: today },
      }),
    ]);

    setTodayTransactions(todayRes.data.transactions);
    setIncompleteTransactions([
      ...processingRes.data.transactions,
      ...signedRes.data.transactions,
    ]);
    setTodayCompleted(releasedTodayRes.data.transactions.length);
  }, [user]);

  // Re-fetch incomplete with search
  useEffect(() => {
    if (!user) return;
    const fetchIncomplete = async () => {
      const params: any = { preparedBy: user.id };
      if (debouncedSearch) params.search = debouncedSearch;

      const [processingRes, signedRes] = await Promise.all([
        api.get('/transactions', { params: { ...params, status: 'Processing' } }),
        api.get('/transactions', { params: { ...params, status: 'Signed' } }),
      ]);
      setIncompleteTransactions([
        ...processingRes.data.transactions,
        ...signedRes.data.transactions,
      ]);
    };
    fetchIncomplete();
  }, [user, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const incompleteCount = incompleteTransactions.length;
  const processingCount = incompleteTransactions.filter((t) => t.status === 'Processing').length;
  const unclaimedCount = incompleteTransactions.filter((t) => t.status === 'Signed').length;

  const filteredToday = statusFilter
    ? todayTransactions.filter((t) => t.status === statusFilter)
    : todayTransactions;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Staff Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
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
        <Card>
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
        <Card>
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
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Unclaimed (Signed)</p>
                <p className="text-2xl font-bold">{unclaimedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <NewRequestForm onCreated={fetchData} />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Today's Requests</CardTitle>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Processing">Processing</option>
              <option value="Signed">Signed</option>
              <option value="Released">Released</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={filteredToday}
            onRelease={(id) => setReleaseId(id)}
            showActions={true}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Incomplete / Unclaimed Documents</CardTitle>
            <Input
              className="max-w-xs"
              placeholder="Search by student name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <TransactionTable
            transactions={incompleteTransactions}
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
    </div>
  );
}
