import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { NativeSelect } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TopScrollContainer } from '@/components/ui/top-scroll';
import { AddStudentDialog } from '@/components/students/AddStudentDialog';
import { BulkImportDialog } from '@/components/students/BulkImportDialog';
import { ChevronLeft, ChevronRight, GraduationCap, Plus, Search, Trash2, Upload } from 'lucide-react';
import { COURSE_ALIASES, abbreviateCourse, formatYearLevel } from '@rtams/shared';
import api from '@/lib/api';

interface Student {
  _id: string;
  studentNumber: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  email: string | null;
  contactNumber: string | null;
  course: string;
  yearLevel: number;
  name: string;
}

const PAGE_SIZE = 50;
const PROGRAMS = Object.keys(COURSE_ALIASES).sort();

export function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [program, setProgram] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // New filters start from the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, program]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_SIZE };
      if (debouncedSearch) params.q = debouncedSearch;
      if (program) params.course = program;
      const { data } = await api.get('/students/directory', { params });
      setStudents(data.students);
      setTotal(data.total);
    } catch {
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, program, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleRemove = async (student: Student) => {
    const confirmed = await confirm({
      title: `Remove ${student.name}?`,
      description:
        `Student #${student.studentNumber} will be removed from the directory. ` +
        'Any requests already encoded for them are kept.',
      confirmText: 'Remove student',
      tone: 'destructive',
    });

    if (!confirmed) return;

    setRemovingId(student._id);
    try {
      const { data } = await api.delete(`/students/${student._id}`);

      // Say when requests were left behind, so it is clear the history
      // survived rather than the removal having half worked.
      const kept = data?.keptTransactions ?? 0;

      toast.success('Student removed', {
        description: kept
          ? `${student.name} — ${kept} existing ${kept === 1 ? 'request' : 'requests'} kept`
          : student.name,
      });

      await fetchStudents();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ?? 'Failed to remove student.';
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!debouncedSearch || !!program;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        eyebrow="Directory"
        title="Students"
        actions={
          <>
            <Button variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Student
            </Button>
            <Button onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4" />
              Import CSV/XLSX
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>Enrolled Students</CardTitle>
              <Badge variant="secondary" className="tabular font-mono">
                {filtered ? `${total} matching` : `Total: ${total} students`}
              </Badge>
              {loading && students.length > 0 && <Spinner size="sm" className="text-muted-foreground" />}
            </div>
            <div data-print-hide className="flex flex-col gap-2 sm:flex-row">
              <NativeSelect
                className="sm:w-44"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                aria-label="Filter by program"
              >
                <option value="">All Programs</option>
                {PROGRAMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </NativeSelect>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  aria-label="Search students"
                  className="pl-9"
                  placeholder="Search by name or student number…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && students.length === 0 && <TableSkeleton cols={6} />}
          {!loading && students.length === 0 && (
            <EmptyState
              icon={filtered ? Search : GraduationCap}
              title={filtered ? 'No students match your filters' : 'No students yet'}
              hint={
                filtered
                  ? 'Try a different name, number, or program.'
                  : 'Use Import CSV/XLSX above to add students.'
              }
            />
          )}
          {students.length > 0 && (
            <>
              <TopScrollContainer>
                <table className="data-table w-full text-sm">
                  <thead className="border-b">
                    <tr className="bg-muted/60 text-left">
                      <th className="px-3 py-2.5 whitespace-nowrap">Student #</th>
                      <th className="px-3 py-2.5">Name</th>
                      <th className="px-3 py-2.5">Program</th>
                      <th className="px-3 py-2.5">Year</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">BU Email</th>
                      <th className="px-3 py-2.5 whitespace-nowrap">Contact Number</th>
                      <th className="px-3 py-2.5" data-print-hide>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s._id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">{s.studentNumber}</td>
                        <td className="px-3 py-2.5 font-medium">{s.name}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap" title={s.course}>
                          {abbreviateCourse(s.course)}
                        </td>
                        <td className="px-3 py-2.5">{formatYearLevel(s.yearLevel)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {s.email ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                          {s.contactNumber ?? '—'}
                        </td>
                        <td className="px-3 py-2.5" data-print-hide>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:border-destructive/40 hover:bg-destructive hover:text-destructive-foreground"
                            loading={removingId === s._id}
                            onClick={() => handleRemove(s)}
                          >
                            {removingId !== s._id && <Trash2 className="h-3.5 w-3.5" />}
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TopScrollContainer>

              {pageCount > 1 && (
                <div data-print-hide className="flex items-center justify-between gap-2 border-t border-border/60 pt-3 text-sm">
                  <span className="tabular font-mono text-xs text-muted-foreground">
                    Page {page} of {pageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pageCount || loading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AddStudentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => fetchStudents()}
      />
      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => fetchStudents()}
      />
    </div>
  );
}
