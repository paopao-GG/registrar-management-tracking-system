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
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { SignDialog } from '@/components/transactions/SignDialog';
import { Input } from '@/components/ui/input';
import { getPhilippineDate } from '@/lib/date';
import api from '@/lib/api';

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
  const [programFilter, setProgramFilter] = useState('');
  const [yearLevelFilter, setYearLevelFilter] = useState('');
  const [signIds, setSignIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // The dashboard always shows one day; an empty picker means today.
  const day = dateFilter || getPhilippineDate();
  const isToday = day === getPhilippineDate();

  const fetchData = useCallback(async () => {
    // Status counts cover the day, program and year, not the status filter.
    const params: Record<string, string | number> = {
      startDate: day,
      endDate: day,
      ...programYearParams(programFilter, yearLevelFilter),
      includeCounts: 1,
      _t: Date.now(),
    };

    if (statusFilter) {
      params.status = statusFilter;
    }

    try {
      const { data } = await api.get('/transactions', { params });
      const counts = data.counts ?? {};

      setTransactions(data.transactions);

      setStats({
        newRequests: counts['Pending'] ?? 0,
        processing: counts['Processing'] ?? 0,
        readyForRelease: counts['Ready for Release'] ?? 0,
        completed: counts['Released'] ?? 0,
      });
    } catch (error) {
      console.error(
        'Failed to refresh admin dashboard:',
        error
      );
    } finally {
      setLoaded(true);
    }
  }, [statusFilter, programFilter, yearLevelFilter, day]);

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
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow={format(parseISO(day), 'EEEE, MMMM d, yyyy')}
        title="Admin Dashboard"
      />

      <StatTiles {...stats} isToday={isToday} loading={!loaded} />

      {/* Requests */}
      <Card>
        <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>{isToday ? "Today's Requests" : 'Requests'}</CardTitle>
              <LiveIndicator />
            </div>
            <CardDescription>
              {loaded ? `${transactions.length} shown` : 'Loading requests…'}
            </CardDescription>
          </div>

          <div data-print-hide className="flex flex-col gap-3 sm:flex-row">
            <Input
              type="date"
              aria-label="Date"
              value={day}
              max={getPhilippineDate()}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full sm:w-44"
            />

            <NativeSelect
              aria-label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="sm:w-48"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
              <option value="Ready for Release">Ready for Release</option>
              <option value="Released">Released</option>
            </NativeSelect>

            <ProgramYearFilters
              compact={false}
              program={programFilter}
              yearLevel={yearLevelFilter}
              onProgramChange={setProgramFilter}
              onYearLevelChange={setYearLevelFilter}
            />
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-2 sm:px-6 sm:pb-6">
          {loaded ? (
            <TransactionTable
              transactions={transactions}
              onSign={setSignIds}
              userRole="admin"
              showActions={true}
            />
          ) : (
            <TableSkeleton cols={7} />
          )}
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
