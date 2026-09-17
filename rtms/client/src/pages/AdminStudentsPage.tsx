import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TopScrollContainer } from '@/components/ui/top-scroll';
import { AddStudentDialog } from '@/components/students/AddStudentDialog';
import { BulkImportDialog } from '@/components/students/BulkImportDialog';
import { Plus, Upload, Trash2 } from 'lucide-react';
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
    const confirmed = window.confirm(
      `Are you sure you want to remove ${student.name}?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/students/${student._id}`);
      await fetchStudents();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ?? 'Failed to remove student.';
      window.alert(message);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!debouncedSearch || !!program;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Students</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
          <Button onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV/XLSX
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-lg">Enrolled Students</CardTitle>
              <Badge variant="secondary">
                {filtered ? `${total} matching` : `Total: ${total} students`}
              </Badge>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm w-full sm:w-44"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                aria-label="Filter by program"
              >
                <option value="">All Programs</option>
                {PROGRAMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <Input
                className="w-full sm:w-72"
                placeholder="Search by name or student number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && students.length === 0 && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {!loading && students.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {filtered ? 'No students match your filters.' : 'No students yet — import a roster to get started.'}
            </p>
          )}
          {students.length > 0 && (
            <>
              <TopScrollContainer>
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium whitespace-nowrap">Student #</th>
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">Program</th>
                      <th className="px-2 py-2 font-medium">Year</th>
                      <th className="px-2 py-2 font-medium whitespace-nowrap">BU Email</th>
                      <th className="px-2 py-2 font-medium whitespace-nowrap">Contact Number</th>
                      <th className="px-2 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s._id} className="border-b last:border-0">
                        <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">{s.studentNumber}</td>
                        <td className="px-2 py-2">{s.name}</td>
                        <td className="px-2 py-2 whitespace-nowrap" title={s.course}>
                          {abbreviateCourse(s.course)}
                        </td>
                        <td className="px-2 py-2">{formatYearLevel(s.yearLevel)}</td>
                        <td className="px-2 py-2 text-muted-foreground">
                          {s.email ?? '—'}
                        </td>
                        <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">
                          {s.contactNumber ?? '—'}
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemove(s)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TopScrollContainer>

              {pageCount > 1 && (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Page {page} of {pageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pageCount || loading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
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
