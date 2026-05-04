import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddStudentDialog } from '@/components/students/AddStudentDialog';
import { BulkImportDialog } from '@/components/students/BulkImportDialog';
import { Plus, Upload } from 'lucide-react';
import api from '@/lib/api';

interface Student {
  _id: string;
  studentNumber: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  email: string | null;
  course: string;
  yearLevel: number;
  name: string;
}

export function AdminStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.q = debouncedSearch;
      const { data } = await api.get('/students', { params });
      setStudents(data);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              {debouncedSearch ? `Results for "${debouncedSearch}"` : 'Recent Students'}
            </CardTitle>
            <Input
              className="w-full sm:max-w-xs"
              placeholder="Search by name or student number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && students.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {debouncedSearch ? 'No students match your search.' : 'No students yet — import a roster to get started.'}
            </p>
          )}
          {!loading && students.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Student #</th>
                    <th className="px-2 py-2 font-medium">Name</th>
                    <th className="px-2 py-2 font-medium">Program</th>
                    <th className="px-2 py-2 font-medium">Year</th>
                    <th className="px-2 py-2 font-medium">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id} className="border-b last:border-0">
                      <td className="px-2 py-2 font-mono text-xs">{s.studentNumber}</td>
                      <td className="px-2 py-2">{s.name}</td>
                      <td className="px-2 py-2">{s.course}</td>
                      <td className="px-2 py-2">{s.yearLevel}</td>
                      <td className="px-2 py-2 text-muted-foreground">{s.email ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
