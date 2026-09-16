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

export function StaffDashboard() {
  const { user } = useAuth();

  const [transactions, setTransactions] =
    useState<any[]>([]);

  const [todayCompleted, setTodayCompleted] = useState(0);

  const [incompleteCount, setIncompleteCount] = useState(0);

  const [processingCount, setProcessingCount] = useState(0);

  const [unclaimedCount, setUnclaimedCount] = useState(0);

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

  const [searchName, setSearchName] = useState('');

  const [debouncedSearch, setDebouncedSearch] =
    useState('');

  // Delay search slightly while typing.
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(searchName),
      300
    );

    return () => clearTimeout(timer);
  }, [searchName]);

  const getPhilippineDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
    }).format(new Date());
  };

  const getDateRange = () => {
    const today = getPhilippineDate();

    if (dateFilter === 'today') {
      return {
        startDate: today,
        endDate: today,
      };
    }

    if (dateFilter === 'yesterday') {
      const date = new Date(
        `${today}T00:00:00+08:00`
      );

      date.setUTCDate(date.getUTCDate() - 1);

      const yesterday = new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone: 'Asia/Manila',
        }
      ).format(date);

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
  };

  const fetchData = useCallback(async () => {
    if (!user) return;

    const dateRange = getDateRange();

    const searchParams: any = {};

    if (debouncedSearch) {
      searchParams.search = debouncedSearch;
    }

    if (dateRange.startDate) {
      searchParams.startDate = dateRange.startDate;
    }

    if (dateRange.endDate) {
      searchParams.endDate = dateRange.endDate;
    }

    if (statusFilter) {
      searchParams.status = statusFilter;
    }

    const [
      transactionsRes,
      pendingRes,
      processingRes,
      readyRes,
      releasedTodayRes,
    ] = await Promise.all([
      // Main transaction table
      api.get('/transactions', {
        params: searchParams,
      }),

      // Pending count
      api.get('/transactions', {
        params: {
          status: 'Pending',
        },
      }),

      // Processing count
      api.get('/transactions', {
        params: {
          status: 'Processing',
        },
      }),

      // Ready for Release count
      api.get('/transactions', {
        params: {
          status: 'Ready for Release',
        },
      }),

      // Completed today
      api.get('/transactions', {
        params: {
          status: 'Released',
          ...getDateRangeForToday(),
        },
      }),
    ]);

    setTransactions(
      transactionsRes.data.transactions
    );

    setProcessingCount(
      processingRes.data.total
    );

    setUnclaimedCount(
      readyRes.data.total
    );

    setIncompleteCount(
      pendingRes.data.total +
        processingRes.data.total +
        readyRes.data.total
    );

    setTodayCompleted(
      releasedTodayRes.data.total
    );
  }, [
    user,
    debouncedSearch,
    statusFilter,
    dateFilter,
    customDate,
  ]);

  const getDateRangeForToday = () => {
    const today = getPhilippineDate();

    return {
      startDate: today,
      endDate: today,
    };
  };

  // Initial load and refresh when filters/search change.
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Automatically refresh every 10 seconds.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData().catch(() => {
        /* silent */
      });
    }, 10_000);

    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">
        Staff Dashboard
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-orange-500" />

              <div>
                <p className="text-sm text-muted-foreground">
                  Total Incomplete
                </p>

                <p className="text-2xl font-bold">
                  {incompleteCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />

              <div>
                <p className="text-sm text-muted-foreground">
                  Unclaimed (Ready for Release)
                </p>

                <p className="text-2xl font-bold">
                  {unclaimedCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <NewRequestForm onCreated={fetchData} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <CardTitle className="text-lg">
              Transactions
            </CardTitle>

            <div className="flex flex-col md:flex-row gap-3">
              {/* Status */}
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

              {/* Date */}
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

              {/* Custom date */}
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

              {/* Student search */}
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