import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { COURSES, YEAR_LEVELS } from '@rtams/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (student: any) => void;
}

export function AddStudentDialog({ open, onClose, onCreated }: Props) {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState<string>(COURSES[0]);
  const [yearLevel, setYearLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setLastName('');
    setFirstName('');
    setMiddleName('');
    setStudentNumber('');
    setEmail('');
    setCourse(COURSES[0]);
    setYearLevel(1);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { lastName, firstName, course, yearLevel };
      if (middleName.trim()) payload.middleName = middleName.trim();
      if (studentNumber.trim()) payload.studentNumber = studentNumber.trim();
      if (email.trim()) payload.email = email.trim();
      const { data } = await api.post('/students', payload);
      onCreated(data);
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to create student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Middle Name <span className="text-muted-foreground">(optional)</span></label>
              <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Student Number <span className="text-muted-foreground">(optional)</span></label>
              <Input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="e.g. 2023-0000-00001" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email <span className="text-muted-foreground">(optional)</span></label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Program</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              {COURSES.map((c: string) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Year Level</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={yearLevel}
              onChange={(e) => setYearLevel(Number(e.target.value))}
            >
              {YEAR_LEVELS.map((y: number) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Add Student'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
