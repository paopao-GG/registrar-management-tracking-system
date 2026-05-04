import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentCounter } from './DocumentCounter';
import { StudentAutocomplete } from '@/components/students/StudentAutocomplete';
import { AddStudentDialog } from '@/components/students/AddStudentDialog';
import { DOCUMENT_TYPES } from '@rtams/shared';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';

interface Props {
  onCreated: () => void;
}

export function NewRequestForm({ onCreated }: Props) {
  const { user } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [docs, setDocs] = useState<Record<string, number>>(
    Object.fromEntries(DOCUMENT_TYPES.map((d: string) => [d, 0]))
  );
  const [others, setOthers] = useState('');
  const [othersCount, setOthersCount] = useState(0);
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      alert('Please select a student');
      return;
    }

    const totalDocs = Object.values(docs).reduce((a, b) => a + b, 0) + othersCount;
    if (totalDocs === 0) {
      alert('Please select at least one document');
      return;
    }

    setLoading(true);
    try {
      await api.post('/transactions', {
        studentId: selectedStudent._id,
        requestedDocuments: docs,
        others,
        othersCount,
      });
      // Reset form
      setSelectedStudent(null);
      setDocs(Object.fromEntries(DOCUMENT_TYPES.map((d: string) => [d, 0])));
      setOthers('');
      setOthersCount(0);
      onCreated();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input value={formatDate(new Date())} disabled />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Received/Prepared By</label>
                <Input value={user?.name || ''} disabled />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Student Name</label>
              <StudentAutocomplete
                onSelect={(s) => setSelectedStudent(s)}
                onAddNew={() => setAddStudentOpen(true)}
                onImported={onCreated}
              />
            </div>

            {selectedStudent && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Program</label>
                  <Input value={selectedStudent.course} disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year Level</label>
                  <Input value={`Year ${selectedStudent.yearLevel}`} disabled />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Requested Documents/Services</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DOCUMENT_TYPES.map((type: string) => (
                  <DocumentCounter
                    key={type}
                    label={type}
                    value={docs[type]}
                    onChange={(v) => setDocs({ ...docs, [type]: v })}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium">Others</label>
                <Input
                  value={others}
                  onChange={(e) => setOthers(e.target.value)}
                  placeholder="Specify other documents..."
                />
              </div>
              <DocumentCounter
                label="Qty"
                value={othersCount}
                onChange={setOthersCount}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AddStudentDialog
        open={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        onCreated={(student) => setSelectedStudent(student)}
      />
    </>
  );
}
