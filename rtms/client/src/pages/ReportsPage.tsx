import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TopScrollContainer } from '@/components/ui/top-scroll';
import api from '@/lib/api';
import { Download } from 'lucide-react';
import type { ArtaReportRow, ReportFormat } from '@rtams/shared';

const EXPORTS: Array<{ format: Exclude<ReportFormat, 'json'>; label: string; file: string }> = [
  { format: 'arta', label: 'ARTA-Logbook export', file: 'ARTA-Logbook' },
  { format: 'bup', label: 'BUP-Logbook export', file: 'BUP-Logbook' },
];

export function ReportsPage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState<ArtaReportRow[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<ReportFormat | null>(null);

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select a date range');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get('/reports', { params: { startDate, endDate } });
      setRows(data.rows);
      setTotalTransactions(data.totalTransactions);
    } catch {
      alert('Failed to generate report');
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
    } catch {
      alert('Failed to export logbook');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Summary Reports</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={fetchReport} disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Loading...' : 'Generate'}
            </Button>
            {rows.length > 0 &&
              EXPORTS.map(({ format, label, file }) => (
                <Button
                  key={format}
                  variant="outline"
                  onClick={() => exportLogbook(format, file)}
                  disabled={exporting !== null}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting === format ? 'Exporting...' : label}
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Results ({totalTransactions} transactions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TopScrollContainer>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium">External Client Name</th>
                    <th className="px-3 py-2 text-left font-medium">Requested Documents/Services</th>
                    <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Contact Number</th>
                    <th className="px-3 py-2 text-left font-medium">University Email Address</th>
                    <th className="px-3 py-2 text-left font-medium whitespace-nowrap">Date of Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-3 py-2 font-medium">{row.clientName}</td>
                      <td className="px-3 py-2">{row.requestedDocuments}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.contactNumber || '—'}</td>
                      <td className="px-3 py-2">{row.email || '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{row.transactionDate}</td>
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
