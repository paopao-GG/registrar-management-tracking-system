import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { SignDialog } from '@/components/transactions/SignDialog';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import {
  FileText,
  Loader,
  Clock,
  CheckCircle,
} from 'lucide-react';

function getPhilippineDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
  }).format(new Date());
}

export function AdminDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);

  const [stats, setStats] = useState({
    newRequests: 0,
    processing: 0,
    readyForRelease: 0,
    todayCompleted: 0,
  });

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [signId, setSignId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const today = getPhilippineDate();

    const [
      pendingRes,
      processingRes,
      readyRes,
      todayReleasedRes,
    ] = await Promise.all([
      api.get('/transactions', {
        params: {
          status: 'Pending',
          _t: Date.now(),
        },
      }),

      api.get('/transactions', {
        params: {
          status: 'Processing',
          _t: Date.now(),
        },
      }),

      api.get('/transactions', {
        params: {
          status: 'Ready for Release',
          _t: Date.now(),
        },
      }),

      api.get('/transactions', {
        params: {
          status: 'Released',
          startDate: today,
          endDate: today,
          _t: Date.now(),
        },
      }),
    ]);

    setStats({
      newRequests: pendingRes.data.total,
      processing: processingRes.data.total,
      readyForRelease: readyRes.data.total,
      todayCompleted: todayReleasedRes.data.total,
    });
  }, []);

  const fetchData = useCallback(async () => {
    const params: Record<string, string | number> = {
      _t: Date.now(),
    };

    if (statusFilter) {
      params.status = statusFilter;
    }

    if (dateFilter) {
      params.startDate = dateFilter;
      params.endDate = dateFilter;
    }

    try {
      const { data } = await api.get('/transactions', {
        params,
      });

      setTransactions(data.transactions);

      await fetchStats();
    } catch (error) {
      console.error(
        'Failed to refresh admin dashboard:',
        error
      );
    }
  }, [statusFilter, dateFilter, fetchStats]);

  // Initial load and refresh whenever filters change.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Automatically refresh from the server every 5 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 5_000);

    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">
        Admin Dashboard
      </h2>

      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* New Requests */}
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />

              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
                New Requests
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {stats.newRequests}
            </div>
          </CardContent>
        </Card>

        {/* Processing */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Loader className="h-8 w-8 text-blue-500" />

              <CardTitle className="text-sm font-medium text-muted-foreground">
                Processing
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {stats.processing}
            </div>
          </CardContent>
        </Card>

        {/* Ready for Release */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />

              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ready for Release
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {stats.readyForRelease}
            </div>
          </CardContent>
        </Card>

        {/* Today's Completed */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />

              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Completed
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {stats.todayCompleted}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            All Requests
          </CardTitle>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">

            {/* Status Filter */}
            <select
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full sm:w-auto"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="">
                All Statuses
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Processing">
                Processing
              </option>

              <option value="Ready for Review">
                Ready for Review / Signing
              </option>

              <option value="Ready for Release">
                Ready for Release
              </option>

              <option value="Released">
                Released
              </option>
            </select>

            {/* Date Filter */}
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) =>
                setDateFilter(e.target.value)
              }
              className="w-full sm:w-48"
            />
          </div>
        </CardHeader>

        <CardContent>
  <TransactionTable
    transactions={transactions}
    onSign={(id) => setSignId(id)}
    userRole="admin"
    showActions={true}
  />
</CardContent>
      </Card>

      {/* Sign Dialog */}
      <SignDialog
        open={!!signId}
        transactionId={signId}
        onClose={() => setSignId(null)}
        onSigned={fetchData}
      />
    </div>
  );
}