import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { SignDialog } from '@/components/transactions/SignDialog';
import { ResetTabletButton } from '@/components/transactions/ResetTabletButton';
import { Input } from '@/components/ui/input';
import { getPhilippineDate } from '@/lib/date';
import api from '@/lib/api';
import {
  FileText,
  Loader,
  Clock,
  CheckCircle,
} from 'lucide-react';

export function AdminDashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);

  const [stats, setStats] = useState({
    newRequests: 0,
    processing: 0,
    readyForRelease: 0,
    completed: 0,
  });

  const [dateFilter, setDateFilter] = useState(getPhilippineDate);
  const [statusFilter, setStatusFilter] = useState('');
  const [signIds, setSignIds] = useState<string[]>([]);

  // The dashboard always shows one day; an empty picker means today.
  const day = dateFilter || getPhilippineDate();
  const isToday = day === getPhilippineDate();

  const fetchData = useCallback(async () => {
    const dayParams = {
      startDate: day,
      endDate: day,
    };

    const params: Record<string, string | number> = {
      ...dayParams,
      _t: Date.now(),
    };

    if (statusFilter) {
      params.status = statusFilter;
    }

    const countFor = (status: string) =>
      api.get('/transactions', {
        params: {
          ...dayParams,
          status,
          limit: 1,
          _t: Date.now(),
        },
      });

    try {
      const [
        transactionsRes,
        pendingRes,
        processingRes,
        readyRes,
        releasedRes,
      ] = await Promise.all([
        api.get('/transactions', { params }),
        countFor('Pending'),
        countFor('Processing'),
        countFor('Ready for Release'),
        countFor('Released'),
      ]);

      setTransactions(transactionsRes.data.transactions);

      setStats({
        newRequests: pendingRes.data.total,
        processing: processingRes.data.total,
        readyForRelease: readyRes.data.total,
        completed: releasedRes.data.total,
      });
    } catch (error) {
      console.error(
        'Failed to refresh admin dashboard:',
        error
      );
    }
  }, [statusFilter, day]);

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Admin Dashboard
        </h2>

        <ResetTabletButton />
      </div>

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

        {/* Completed */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />

              <CardTitle className="text-sm font-medium text-muted-foreground">
                {isToday ? "Today's Completed" : 'Completed'}
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {stats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isToday ? "Today's Requests" : 'Requests'}
          </CardTitle>

          <div className="flex flex-col sm:flex-row gap-3 mt-2">

            {/* Date Filter */}
            <Input
              type="date"
              value={day}
              max={getPhilippineDate()}
              onChange={(e) =>
                setDateFilter(e.target.value)
              }
              className="w-full sm:w-48"
            />

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

              <option value="Ready for Release">
                Ready for Release
              </option>

              <option value="Released">
                Released
              </option>
            </select>
          </div>
        </CardHeader>

        <CardContent>
          <TransactionTable
            transactions={transactions}
            onSign={setSignIds}
            userRole="admin"
            showActions={true}
          />
        </CardContent>
      </Card>

      {/* Sign Dialog */}
      <SignDialog
        open={signIds.length > 0}
        transactionIds={signIds}
        onClose={() => setSignIds([])}
        onSigned={fetchData}
      />
    </div>
  );
}
