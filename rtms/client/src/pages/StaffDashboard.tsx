import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NewRequestForm } from '@/components/transactions/NewRequestForm';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { ReleaseDialog } from '@/components/transactions/ReleaseDialog';
import { StartProcessingDialog } from '@/components/transactions/StartProcessingDialog';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import {
  FileText,
  CheckCircle,
  Clock,
  Loader,
} from 'lucide-react';

function getPhilippineDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
  }).format(new Date());
}

function getYesterdayPhilippineDate() {
  const today = getPhilippineDate();

  const date = new Date(`${today}T00:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() - 1);

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
  }).format(date);
}

function getDateRange(
  dateFilter: string,
  customDate: string
) {
  if (dateFilter === 'today') {
    const today = getPhilippineDate();

    return {
      startDate: today,
      endDate: today,
    };
  }

  if (dateFilter === 'yesterday') {
    const yesterday = getYesterdayPhilippineDate();

    return {
      startDate: yesterday,
      endDate: yesterday,
    };
  }

  if (dateFilter === 'custom' && customDate) {
    return {
      startDate: customDate,
      endDate: customDate,
    };
  }

  return {};
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

  const [todayCompleted, setTodayCompleted] =
    useState(0);

  const [releaseTransaction, setReleaseTransaction] =
    useState<{
      id: string;
      studentName: string;
    } | null>(null);

  const [startProcessingId, setStartProcessingId] =
    useState<string | null>(null);

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

    const dateRange = getDateRange(
      dateFilter,
      customDate
    );

    const searchParams: Record<
      string,
      string | number
    > = {
      _t: Date.now(),
    };

    if (debouncedSearch) {
      searchParams.search = debouncedSearch;
    }

    if (dateRange.startDate) {
      searchParams.startDate =
        dateRange.startDate;
    }

    if (dateRange.endDate) {
      searchParams.endDate =
        dateRange.endDate;
    }

    if (statusFilter) {
      searchParams.status = statusFilter;
    }

    const today = getPhilippineDate();

    try {
      const [
        transactionsRes,
        pendingRes,
        processingRes,
        readyRes,
        releasedTodayRes,
      ] = await Promise.all([
        api.get('/transactions', {
          params: searchParams,
        }),

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

      setTodayCompleted(
        releasedTodayRes.data.total
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">
        Staff Dashboard
      </h2>

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

        {/* Today's Completed */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />

              <div>
                <p className="text-sm text-muted-foreground">
                  Today's Completed
                </p>

                <p className="text-2xl font-bold">
                  {todayCompleted}
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

                <option value="all">
                  All Dates
                </option>
              </select>

              {/* Custom Date */}
              {dateFilter === 'custom' && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) =>
                    setCustomDate(e.target.value)
                  }
                  className="w-full md:w-48"
                />
              )}

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
            onStartProcessing={(id) =>
              setStartProcessingId(id)
            }
            onRelease={(id, studentName) =>
              setReleaseTransaction({
                id,
                studentName,
              })
            }
            showActions={true}
          />
        </CardContent>
      </Card>

      {/* Release */}
      <ReleaseDialog
        open={!!releaseTransaction}
        transactionId={
          releaseTransaction?.id || null
        }
        studentName={
          releaseTransaction?.studentName || ''
        }
        onClose={() =>
          setReleaseTransaction(null)
        }
        onReleased={fetchData}
      />

      {/* Start Processing */}
      <StartProcessingDialog
        open={!!startProcessingId}
        transactionId={startProcessingId}
        onClose={() =>
          setStartProcessingId(null)
        }
        onStarted={fetchData}
      />
    </div>
  );
}