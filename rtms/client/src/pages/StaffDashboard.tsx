import { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { NativeSelect } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { LiveIndicator, StatTiles } from '@/components/dashboard/StatTiles';
import { ProgramYearFilters, programYearParams } from '@/components/dashboard/ProgramYearFilters';
import { Input } from '@/components/ui/input';
import { NewRequestForm } from '@/components/transactions/NewRequestForm';
import {
  TransactionTable,
  type ReleaseTarget,
} from '@/components/transactions/TransactionTable';
import { ReleaseDialog } from '@/components/transactions/ReleaseDialog';
import { StartProcessingDialog } from '@/components/transactions/StartProcessingDialog';
import { useAuth } from '@/lib/auth';
import { getPhilippineDate, getYesterdayPhilippineDate } from '@/lib/date';
import api from '@/lib/api';
import { Search } from 'lucide-react';

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

  const [programFilter, setProgramFilter] = useState('');

  const [yearLevelFilter, setYearLevelFilter] = useState('');

  const [dateFilter, setDateFilter] =
    useState('today');

  const [customDate, setCustomDate] =
    useState('');

  const [searchName, setSearchName] =
    useState('');

  const [loaded, setLoaded] = useState(false);

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

    // Date, program and year apply to both the list and the stat tiles.
    const dayParams = {
      startDate: day,
      endDate: day,
      ...programYearParams(programFilter, yearLevelFilter),
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
    } finally {
      setLoaded(true);
    }
  }, [
    user,
    dateFilter,
    customDate,
    statusFilter,
    programFilter,
    yearLevelFilter,
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

  const selectedDay = getSelectedDay(dateFilter, customDate);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow={format(parseISO(selectedDay), 'EEEE, MMMM d, yyyy')}
        title={`Good day, ${user?.name?.split(' ')[0] ?? 'there'}`}
      />

      <StatTiles
        newRequests={newRequestsCount}
        processing={processingCount}
        readyForRelease={readyForReleaseCount}
        completed={completedCount}
        isToday={isToday}
        loading={!loaded}
      />

      {/* New Request */}
      <NewRequestForm onCreated={fetchData} />

      {/* Transactions */}
      <Card>
        <CardHeader className="gap-4 space-y-0">
          <div className="space-y-1">
            <p className="eyebrow">Queue</p>
            <div className="flex items-center gap-2">
              <CardTitle>Transactions</CardTitle>
              <LiveIndicator />
            </div>
            <CardDescription>
              {loaded ? `${transactions.length} shown` : 'Loading transactions…'}
            </CardDescription>
          </div>

          <div data-print-hide className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            {/* Date Filter */}
            <NativeSelect
              compact
              aria-label="Date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);

                if (e.target.value !== 'custom') {
                  setCustomDate('');
                }
              }}
              className="md:w-40"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="custom">Custom Date</option>
            </NativeSelect>

            {/* Custom Date */}
            {dateFilter === 'custom' && (
              <Input
                type="date"
                aria-label="Custom date"
                value={customDate}
                max={getPhilippineDate()}
                onChange={(e) => setCustomDate(e.target.value)}
                className="h-9 w-full md:w-44"
              />
            )}

            {/* Status Filter */}
            <NativeSelect
              compact
              aria-label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="md:w-48"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Ready for Release">Ready for Release</option>
              <option value="Released">Released</option>
            </NativeSelect>

            <ProgramYearFilters
              program={programFilter}
              yearLevel={yearLevelFilter}
              onProgramChange={setProgramFilter}
              onYearLevelChange={setYearLevelFilter}
            />

            {/* Search */}
            <div className="relative w-full md:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                aria-label="Search by student name"
                className="h-9 pl-9"
                placeholder="Search by student name…"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-2 sm:px-6 sm:pb-6">
          {loaded ? (
            <TransactionTable
              transactions={transactions}
              onStartProcessing={setStartProcessingIds}
              onRelease={setReleaseTargets}
              showActions={true}
            />
          ) : (
            <TableSkeleton cols={7} />
          )}
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
