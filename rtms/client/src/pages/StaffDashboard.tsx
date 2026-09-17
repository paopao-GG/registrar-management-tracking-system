import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NewRequestForm } from '@/components/transactions/NewRequestForm';
import {
  TransactionTable,
  type ReleaseTarget,
} from '@/components/transactions/TransactionTable';
import { ReleaseDialog } from '@/components/transactions/ReleaseDialog';
import { StartProcessingDialog } from '@/components/transactions/StartProcessingDialog';
import { ResetTabletButton } from '@/components/transactions/ResetTabletButton';
import { useAuth } from '@/lib/auth';
import { getPhilippineDate, getYesterdayPhilippineDate } from '@/lib/date';
import api from '@/lib/api';
import {
  FileText,
  CheckCircle,
  Clock,
  Loader,
} from 'lucide-react';

/*
 * The dashboard always shows a single day. A custom
 * filter without a picked date falls back to today.
 */
function getSelectedDay(
  dateFilter: string,
  customDate: string
) {
  if (dateFilter === 'yesterday') {
    return getYesterdayPhilippineDate();
  }

  if (dateFilter === 'custom' && customDate) {
    return customDate;
  }

  return getPhilippineDate();
}

export function StaffDashboard() {
  const { user } = useAuth();

  const [transactions, setTransactions] =
    useState<any[]>([]);

  const [newRequestsCount, setNewRequestsCount] =
    useState(0);

  const [processingCount, setProcessingCount] =
    useState(0);

  const [readyForReleaseCount, setReadyForReleaseCount] =
    useState(0);

  const [completedCount, setCompletedCount] =
    useState(0);

  const [releaseTargets, setReleaseTargets] =
    useState<ReleaseTarget[]>([]);

  const [startProcessingIds, setStartProcessingIds] =
    useState<string[]>([]);

  const [statusFilter, setStatusFilter] = useState('');

  const [dateFilter, setDateFilter] =
    useState('today');

  const [customDate, setCustomDate] =
    useState('');

  const [searchName, setSearchName] =
    useState('');

  const [debouncedSearch, setDebouncedSearch] =
    useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchName);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchName]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const day = getSelectedDay(
      dateFilter,
      customDate
    );

    const dayParams = {
      startDate: day,
      endDate: day,
    };

    const searchParams: Record<
      string,
      string | number
    > = {
      ...dayParams,
      _t: Date.now(),
    };

    if (debouncedSearch) {
      searchParams.search = debouncedSearch;
    }

    if (statusFilter) {
      searchParams.status = statusFilter;
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
        api.get('/transactions', {
          params: searchParams,
        }),
        countFor('Pending'),
        countFor('Processing'),
        countFor('Ready for Release'),
        countFor('Released'),
      ]);

      setTransactions(
        transactionsRes.data.transactions
      );

      setNewRequestsCount(
        pendingRes.data.total
      );

      setProcessingCount(
        processingRes.data.total
      );

      setReadyForReleaseCount(
        readyRes.data.total
      );

      setCompletedCount(
        releasedRes.data.total
      );
    } catch (error) {
      console.error(
        'Failed to refresh staff dashboard:',
        error
      );
    }
  }, [
    user,
    dateFilter,
    customDate,
    statusFilter,
    debouncedSearch,
  ]);

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

  const isToday = dateFilter === 'today' ||
    (dateFilter === 'custom' && (!customDate || customDate === getPhilippineDate()));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Staff Dashboard
        </h2>

        <ResetTabletButton />
      </div>

      {/* Dashboard Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        {/* New Requests */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />

              <div>
                <p className="text-sm text-muted-foreground">
                  New Requests
                </p>

                <p className="text-2xl font-bold">
                  {newRequestsCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Loader className="h-8 w-8 text-blue-500" />

              <div>
                <p className="text-sm text-muted-foreground">
                  Processing
                </p>

                <p className="text-2xl font-bold">
                  {processingCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ready for Release */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />

              <div>
                <p className="text-sm text-muted-foreground">
                  Ready for Release
                </p>

                <p className="text-2xl font-bold">
                  {readyForReleaseCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />

              <div>
                <p className="text-sm text-muted-foreground">
                  {isToday ? "Today's Completed" : 'Completed'}
                </p>

                <p className="text-2xl font-bold">
                  {completedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Request */}
      <NewRequestForm onCreated={fetchData} />

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <CardTitle className="text-lg">
              Transactions
            </CardTitle>

            <div className="flex flex-col md:flex-row gap-3">

              {/* Date Filter */}
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full md:w-auto"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);

                  if (e.target.value !== 'custom') {
                    setCustomDate('');
                  }
                }}
              >
                <option value="today">
                  Today
                </option>

                <option value="yesterday">
                  Yesterday
                </option>

                <option value="custom">
                  Custom Date
                </option>
              </select>

              {/* Custom Date */}
              {dateFilter === 'custom' && (
                <Input
                  type="date"
                  value={customDate}
                  max={getPhilippineDate()}
                  onChange={(e) =>
                    setCustomDate(e.target.value)
                  }
                  className="w-full md:w-48"
                />
              )}

              {/* Status Filter */}
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm w-full md:w-auto"
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

              {/* Search */}
              <Input
                className="w-full md:max-w-xs"
                placeholder="Search by student name..."
                value={searchName}
                onChange={(e) =>
                  setSearchName(e.target.value)
                }
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <TransactionTable
            transactions={transactions}
            onStartProcessing={setStartProcessingIds}
            onRelease={setReleaseTargets}
            showActions={true}
          />
        </CardContent>
      </Card>

      {/* Release */}
      <ReleaseDialog
        open={releaseTargets.length > 0}
        transactions={releaseTargets}
        onClose={() => setReleaseTargets([])}
        onReleased={fetchData}
      />

      {/* Start Processing */}
      <StartProcessingDialog
        open={startProcessingIds.length > 0}
        transactionIds={startProcessingIds}
        onClose={() => setStartProcessingIds([])}
        onStarted={fetchData}
      />
    </div>
  );
}
