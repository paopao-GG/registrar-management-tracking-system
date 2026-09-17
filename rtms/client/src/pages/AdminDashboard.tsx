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
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { SignDialog } from '@/components/transactions/SignDialog';
import { ResetTabletButton } from '@/components/transactions/ResetTabletButton';
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
  const [signIds, setSignIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

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
    } finally {
      setLoaded(true);
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
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow={format(parseISO(day), 'EEEE, MMMM d, yyyy')}
        title="Admin Dashboard"
        description="Review, sign, and monitor the registrar's requests for the day."
        actions={<ResetTabletButton />}
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
