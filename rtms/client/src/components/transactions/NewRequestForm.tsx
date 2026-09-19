import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { DocumentCounter } from './DocumentCounter';
import { StudentAutocomplete } from '@/components/students/StudentAutocomplete';
import { AddStudentDialog } from '@/components/students/AddStudentDialog';
import { DOCUMENT_TYPES, abbreviateCourse } from '@rtams/shared';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import api from '@/lib/api';
import { GraduationCap, Save } from 'lucide-react';

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
  const [alumniOpen, setAlumniOpen] = useState(false);
  // Remounts the search box so it clears after a save.
  const [studentFieldKey, setStudentFieldKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.warning('Please select a student');
      return;
    }

    const totalDocs = Object.values(docs).reduce((a, b) => a + b, 0) + othersCount;
    if (totalDocs === 0) {
      toast.warning('Please select at least one document');
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
      setStudentFieldKey((k) => k + 1);
      toast.success('Request saved', { description: `${totalDocs} document${totalDocs === 1 ? '' : 's'} queued for processing.` });
      onCreated();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <p className="eyebrow">Intake</p>
          <CardTitle>New Request</CardTitle>
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
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Student Name</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAlumniOpen(true)}
                >
                  <GraduationCap className="h-4 w-4" />
                  Alumni
                </Button>
              </div>
              <StudentAutocomplete
                key={studentFieldKey}
                selectedName={selectedStudent?.name}
                onSelect={(s) => setSelectedStudent(s)}
                onImported={onCreated}
              />
            </div>

            {selectedStudent && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {selectedStudent.isAlumni ? 'Alumni' : 'Student'}
                  </label>
                  <Input value={selectedStudent.name} disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Program &amp; Year</label>
                  <Input
                    value={`${abbreviateCourse(selectedStudent.course)} - ${
                      selectedStudent.isAlumni
                        ? 'Alumni'
                        : `Year ${selectedStudent.yearLevel}`
                    }`}
                    disabled
                  />
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

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              {!loading && <Save className="h-4 w-4" />}
              {loading ? 'Saving…' : 'Save Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AddStudentDialog
        open={alumniOpen}
        mode="alumni"
        onClose={() => setAlumniOpen(false)}
        onCreated={(alumni) => setSelectedStudent(alumni)}
      />
    </>
  );
}
