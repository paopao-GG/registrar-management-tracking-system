import { useState } from 'react';
import { format as formatDateFns, parseISO } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { TopScrollContainer } from '@/components/ui/top-scroll';
import { useToast } from '@/components/ui/toast';
import api from '@/lib/api';
import { BarChart3, CalendarRange, Download, FileSearch, Printer } from 'lucide-react';
import type { ArtaReportRow, ReportFormat } from '@rtams/shared';

const EXPORTS: Array<{ format: Exclude<ReportFormat, 'json'>; label: string; file: string }> = [
  { format: 'arta', label: 'ARTA-Logbook export', file: 'ARTA-Logbook' },
  { format: 'bup', label: 'BUP-Logbook export', file: 'BUP-Logbook' },
];

const prettyDate = (value: string) => formatDateFns(parseISO(value), 'MMM d, yyyy');

export function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState<ArtaReportRow[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{ start: string; end: string } | null>(null);
  const [exporting, setExporting] = useState<ReportFormat | null>(null);
  const toast = useToast();

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      toast.warning('Please select a date range');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/reports', { params: { startDate, endDate } });
      setRows(data.rows);
      setTotalTransactions(data.totalTransactions);
      setGenerated({ start: startDate, end: endDate });
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const exportLogbook = async (format: Exclude<ReportFormat, 'json'>, file: string) => {
    setExporting(format);
    try {
      const { data } = await api.get('/reports', {
        params: { startDate, endDate, format },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file}-${startDate}-to-${endDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export ready', { description: a.download });
    } catch {
      toast.error('Failed to export logbook');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Reporting"
        title="Summary Reports"
        actions={
          rows.length > 0 && (
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
          )
        }
      />

      <Card data-print-hide>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-seal" />
            <CardTitle className="text-lg">Date range</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2">
              <label htmlFor="report-start" className="text-sm font-medium">Start Date</label>
              <Input
                id="report-start"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="report-end" className="text-sm font-medium">End Date</label>
              <Input
                id="report-end"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchReport} loading={loading} className="w-full sm:w-auto">
              {!loading && <BarChart3 className="h-4 w-4" />}
              {loading ? 'Generating…' : 'Generate'}
            </Button>
            {rows.length > 0 && (
              <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
                {EXPORTS.map(({ format, label, file }) => (
                  <Button
                    key={format}
                    variant="outline"
                    onClick={() => exportLogbook(format, file)}
                    loading={exporting === format}
                    disabled={exporting !== null}
                    className="w-full sm:w-auto"
                  >
                    {exporting !== format && <Download className="h-4 w-4" />}
                    {exporting === format ? 'Exporting…' : label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <TableSkeleton cols={5} rows={8} className="p-2" />
        </Card>
      )}

      {!loading && generated && rows.length === 0 && (
        <Card>
          <EmptyState
            icon={FileSearch}
            title="No transactions in this range"
            hint={`Nothing was recorded between ${prettyDate(generated.start)} and ${prettyDate(generated.end)}.`}
          />
        </Card>
      )}

      {!loading && rows.length > 0 && (
        <Card>
          <CardHeader>
            <p className="eyebrow">Results</p>
            <CardTitle>
              <span className="tabular">{totalTransactions}</span> transactions
            </CardTitle>
            {generated && (
              <CardDescription>
                {prettyDate(generated.start)} – {prettyDate(generated.end)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="px-0 sm:px-6">
            <TopScrollContainer>
              <table className="data-table w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className="px-3 py-2.5 text-left">External Client Name</th>
                    <th className="px-3 py-2.5 text-left">Requested Documents/Services</th>
                    <th className="px-3 py-2.5 text-left">University Email Address</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left">Contact Number</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left">Date of Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="px-3 py-2.5 font-medium">{row.clientName}</td>
                      <td className="px-3 py-2.5">{row.requestedDocuments}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{row.email || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs">{row.contactNumber || '—'}</td>
                      <td className="tabular whitespace-nowrap px-3 py-2.5 font-mono text-xs">{row.transactionDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TopScrollContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
