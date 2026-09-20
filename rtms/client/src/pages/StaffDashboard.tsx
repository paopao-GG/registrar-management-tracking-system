import { useState, useEffect, useCallback } from 'react';
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
import {
  formatPeriod,
  getPhilippineDate,
  getPhilippineDateDaysAgo,
  getYesterdayPhilippineDate,
  type DateRange,
} from '@/lib/date';
import api from '@/lib/api';
import { Search } from 'lucide-react';

/*
 * Today, yesterday, or a custom range. An empty end of the
 * range means that side is unbounded, so clearing both shows
 * every date.
 */
function getDateRange(
  dateFilter: string,
  rangeStart: string,
  rangeEnd: string
): DateRange {
  if (dateFilter === 'yesterday') {
    const day = getYesterdayPhilippineDate();
    return { startDate: day, endDate: day };
  }

  if (dateFilter === 'range') {
    return {
      startDate: rangeStart || undefined,
      endDate: rangeEnd || undefined,
    };
  }

  const today = getPhilippineDate();
  return { startDate: today, endDate: today };
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

  // Rows matching the current filters, which may exceed those returned.
  const [totalMatching, setTotalMatching] =
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

  const [rangeStart, setRangeStart] =
    useState('');

  const [rangeEnd, setRangeEnd] =
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

    const { startDate, endDate } = getDateRange(
      dateFilter,
      rangeStart,
      rangeEnd
    );

    // Status counts cover the period, program and year, not the status or search.
    const params: Record<
      string,
      string | number
    > = {
      ...programYearParams(programFilter, yearLevelFilter),
      includeCounts: 1,
      _t: Date.now(),
    };

    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    // A span can hold far more than one day's requests.
    if (!startDate || startDate !== endDate) {
      params.limit = 200;
    }

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }

    if (statusFilter) {
      params.status = statusFilter;
    }

    try {
      const { data } = await api.get('/transactions', {
        params,
      });

      const counts = data.counts ?? {};

      setTransactions(data.transactions);
      setTotalMatching(data.total ?? 0);
      setNewRequestsCount(counts['Pending'] ?? 0);
      setProcessingCount(counts['Processing'] ?? 0);
      setReadyForReleaseCount(counts['Ready for Release'] ?? 0);
      setCompletedCount(counts['Released'] ?? 0);
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
    rangeStart,
    rangeEnd,
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

  const period = getDateRange(dateFilter, rangeStart, rangeEnd);
  const today = getPhilippineDate();
  const isToday =
    period.startDate === today && period.endDate === today;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow={formatPeriod(period)}
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
              {!loaded
                ? 'Loading transactions…'
                : totalMatching > transactions.length
                  ? `${transactions.length} of ${totalMatching} shown — narrow with search`
                  : `${transactions.length} shown`}
            </CardDescription>
          </div>

          <div data-print-hide className="flex flex-col gap-3 md:flex-row md:flex-wrap">
            {/* Date Filter */}
            <NativeSelect
              compact
              aria-label="Date"
              value={dateFilter}
              onChange={(e) => {
                const value = e.target.value;
                setDateFilter(value);

                if (value === 'range') {
                  // Open on the past week rather than an empty range.
                  if (!rangeStart) setRangeStart(getPhilippineDateDaysAgo(6));
                  if (!rangeEnd) setRangeEnd(getPhilippineDate());
                }
              }}
              className="md:w-40"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="range">Date Range</option>
            </NativeSelect>

            {/* Date Range */}
            {dateFilter === 'range' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  aria-label="From date"
                  value={rangeStart}
                  max={rangeEnd || getPhilippineDate()}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="h-9 w-full md:w-40"
                />
                <span aria-hidden="true" className="text-muted-foreground">–</span>
                <Input
                  type="date"
                  aria-label="To date"
                  value={rangeEnd}
                  min={rangeStart || undefined}
                  max={getPhilippineDate()}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="h-9 w-full md:w-40"
                />
              </div>
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
