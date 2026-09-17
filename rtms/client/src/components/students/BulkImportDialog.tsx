import { useState, useRef, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import {
  MAX_BULK_IMPORT_ROWS,
  type BulkImportRow,
  type BulkImportResult,
} from '@rtams/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  onImported?: () => void;
}

const HEADER_MAP: Record<string, keyof BulkImportRow> = {
  studentnumber: 'studentNumber',
  lastname: 'lastName',
  firstname: 'firstName',
  middlename: 'middleName',
  program: 'course',
  course: 'course',
  yearlevel: 'yearLevel',
  email: 'email',
  emailaddress: 'email',
  buemail: 'email',
  sex: 'sex',
  gender: 'sex',
  contactnumber: 'contactNumber',
  contactno: 'contactNumber',
  mobilenumber: 'contactNumber',
  mobileno: 'contactNumber',
};

const REQUIRED_KEYS: Array<keyof BulkImportRow> = [
  'studentNumber',
  'lastName',
  'firstName',
  'course',
  'yearLevel',
];

const TEMPLATE_HEADERS = [
  'Student Number',
  'Last Name',
  'First Name',
  'Middle Name',
  'Program',
  'Year Level',
  'Email Address',
  'Sex',
  'Contact Number',
];

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function rowsFromTable(
  headers: string[],
  records: Array<Record<string, unknown>>
): {
  rows: BulkImportRow[];
  headerError: string | null;
} {
  const headerLookup = new Map<string, keyof BulkImportRow>();

  for (const h of headers) {
    const key = HEADER_MAP[normalizeHeader(h)];
    if (key) headerLookup.set(h, key);
  }

  const mappedKeys = new Set(headerLookup.values());
  const missing = REQUIRED_KEYS.filter((k) => !mappedKeys.has(k));

  if (missing.length > 0) {
    return {
      rows: [],
      headerError: `Missing required column(s): ${missing.join(
        ', '
      )}. Download the template for the expected headers.`,
    };
  }

  const rows: BulkImportRow[] = records.map((rec) => {
    const out: Partial<BulkImportRow> = {};

    for (const [origHeader, targetKey] of headerLookup) {
      const raw = rec[origHeader];

      if (targetKey === 'yearLevel') {
        const n =
          typeof raw === 'number'
            ? raw
            : Number(String(raw ?? '').trim());

        out.yearLevel = Number.isFinite(n) ? n : NaN;
      } else {
        const s = String(raw ?? '').trim();
        if (s) (out as any)[targetKey] = s;
      }
    }

    return out as BulkImportRow;
  });

  return { rows, headerError: null };
}

async function parseFile(
  file: File
): Promise<{
  headers: string[];
  records: Array<Record<string, unknown>>;
}> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'xlsx') {
    const grid = await readXlsxFile(file);

    if (grid.length === 0) {
      return { headers: [], records: [] };
    }

    // Find the actual header row in the Registrar's Excel file.
    const headerRowIndex = grid.findIndex((row) =>
      row.some(
        (cell) =>
          normalizeHeader(String(cell ?? '')) === 'studentnumber'
      )
    );

    if (headerRowIndex === -1) {
      return { headers: [], records: [] };
    }

    const headers = grid[headerRowIndex].map((c) => String(c ?? ''));

    const records = grid
      .slice(headerRowIndex + 1)
      .filter((row) =>
        row.some((cell) => String(cell ?? '').trim() !== '')
      )
      .map((row) => {
        const r: Record<string, unknown> = {};

        headers.forEach((h, i) => {
          r[h] = row[i];
        });

        return r;
      });

    return { headers, records };
  }

  // Default: CSV
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        resolve({
          headers: results.meta.fields ?? [],
          records: results.data,
        });
      },

      error: (err) => reject(err),
    });
  });
}

function downloadTemplate() {
  const csv = TEMPLATE_HEADERS.join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'student-import-template.csv';
  a.click();

  URL.revokeObjectURL(url);
}

function downloadFailedCsv(
  failed: BulkImportResult['failed']
) {
  const lines = ['Row,Reason'];

  for (const f of failed) {
    const reason = f.reason.replace(/"/g, '""');
    lines.push(`${f.row},"${reason}"`);
  }

  const blob = new Blob([lines.join('\n')], {
    type: 'text/csv',
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'failed-rows.csv';
  a.click();

  URL.revokeObjectURL(url);
}

export function BulkImportDialog({
  open,
  onClose,
  onImported,
}: Props) {
  const [rows, setRows] = useState<BulkImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);

  // Controls the warning confirmation dialog.
  const [showWarning, setShowWarning] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRows([]);
    setFileName('');
    setParseError(null);
    setResult(null);
    setShowWarning(false);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFile = async (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setResult(null);
    setShowWarning(false);

    try {
      const { headers, records } = await parseFile(file);

      if (records.length === 0) {
        setParseError('No data rows found in file.');
        setRows([]);
        return;
      }

      if (records.length > MAX_BULK_IMPORT_ROWS) {
        setParseError(
          `File has ${records.length} rows; max is ${MAX_BULK_IMPORT_ROWS}.`
        );
        setRows([]);
        return;
      }

      const {
        rows: parsed,
        headerError,
      } = rowsFromTable(headers, records);

      if (headerError) {
        setParseError(headerError);
        setRows([]);
        return;
      }

      setRows(parsed);
    } catch (err) {
      setParseError(
        err instanceof Error
          ? err.message
          : 'Failed to parse file'
      );

      setRows([]);
    }
  };

  // Opens the warning instead of immediately importing.
  const handleImportClick = () => {
    if (rows.length === 0 || parseError) return;

    setShowWarning(true);
  };

  // Performs the actual directory update after confirmation.
  const handleConfirmImport = async () => {
    if (rows.length === 0) return;

    setShowWarning(false);
    setSubmitting(true);

    try {
      const { data } =
        await api.post<BulkImportResult>(
          '/students/bulk',
          rows
        );

      setResult(data);

      if (
        data.created > 0 ||
        data.updated > 0 ||
        data.reactivated > 0 ||
        data.deactivated > 0
      ) {
        onImported?.();
      }
    } catch (err: any) {
      setParseError(
        err?.response?.data?.error ??
          'Import failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const previewRows = rows.slice(0, 10);

  return (
    <>
      {/* Main Import Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => !v && handleClose()}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Update Student Directory
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              <p className="font-medium">
                Full-directory update
              </p>

              <p className="mt-1 text-muted-foreground">
                Upload the complete and latest Registrar
                student directory. Students included in the
                file will be updated or added, while students
                missing from the file will be marked inactive.
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground">
                Upload a <code>.csv</code> or{' '}
                <code>.xlsx</code> file. Max{' '}
                {MAX_BULK_IMPORT_ROWS} rows.
              </p>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={downloadTemplate}
              >
                Download template
              </Button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFile}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-primary-foreground hover:file:bg-primary/90"
            />

            {fileName && !parseError && (
              <p className="text-sm text-muted-foreground">
                {fileName}: {rows.length} rows parsed.
              </p>
            )}

            {parseError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {parseError}
              </div>
            )}

            {!result && previewRows.length > 0 && (
              <div className="rounded-md border overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">
                        #
                      </th>
                      <th className="px-2 py-1 text-left">
                        Student #
                      </th>
                      <th className="px-2 py-1 text-left">
                        Last
                      </th>
                      <th className="px-2 py-1 text-left">
                        First
                      </th>
                      <th className="px-2 py-1 text-left">
                        Program
                      </th>
                      <th className="px-2 py-1 text-left">
                        Year
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr
                        key={i}
                        className="border-t"
                      >
                        <td className="px-2 py-1">
                          {i + 2}
                        </td>

                        <td className="px-2 py-1">
                          {r.studentNumber}
                        </td>

                        <td className="px-2 py-1">
                          {r.lastName}
                        </td>

                        <td className="px-2 py-1">
                          {r.firstName}
                        </td>

                        <td className="px-2 py-1">
                          {r.course}
                        </td>

                        <td className="px-2 py-1">
                          {r.yearLevel}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {rows.length > previewRows.length && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    …and {rows.length - previewRows.length}{' '}
                    more
                  </p>
                )}
              </div>
            )}

            {result && (
              <div className="space-y-2 rounded-md border p-3 text-sm">
                <p>
                  <span className="font-medium text-green-600">
                    {result.created}
                  </span>{' '}
                  created,{' '}
                  <span className="font-medium text-blue-600">
                    {result.updated}
                  </span>{' '}
                  updated,{' '}
                  <span className="font-medium text-purple-600">
                    {result.reactivated}
                  </span>{' '}
                  reactivated,{' '}
                  <span className="font-medium text-amber-600">
                    {result.deactivated}
                  </span>{' '}
                  inactive.
                </p>

                {result.failed.length > 0 && (
                  <div className="text-xs">
                    <details>
                      <summary className="cursor-pointer text-muted-foreground">
                        Failed rows
                      </summary>

                      <ul className="mt-1 space-y-0.5">
                        {result.failed.map((f, i) => (
                          <li key={i}>
                            row {f.row}: {f.reason}
                          </li>
                        ))}
                      </ul>
                    </details>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        downloadFailedCsv(result.failed)
                      }
                    >
                      Download failed rows
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                {result ? 'Close' : 'Cancel'}
              </Button>

              {!result && (
                <Button
                  type="button"
                  onClick={handleImportClick}
                  disabled={
                    rows.length === 0 ||
                    !!parseError ||
                    submitting
                  }
                >
                  {submitting
                    ? 'Updating…'
                    : `Update Directory (${rows.length})`}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-directory warning */}
      <Dialog
        open={showWarning}
        onOpenChange={setShowWarning}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Confirm Student Directory Update
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
              <p className="font-medium">
                Please make sure this is the complete
                latest directory.
              </p>

              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>
                  Students in the file will be updated or
                  added.
                </li>

                <li>
                  Students missing from the file will be
                  marked inactive.
                </li>

                <li>
                  Inactive students are not deleted and
                  their existing transaction history is
                  preserved.
                </li>

                <li>
                  Students can be reactivated when they
                  appear in a future directory update.
                </li>
              </ul>
            </div>

            <p className="text-sm text-muted-foreground">
              Are you sure you want to update the student
              directory using{' '}
              <span className="font-medium text-foreground">
                {fileName}
              </span>
              ?
            </p>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowWarning(false)}
                disabled={submitting}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleConfirmImport}
                disabled={submitting}
              >
                {submitting
                  ? 'Updating…'
                  : 'Yes, Update Directory'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}