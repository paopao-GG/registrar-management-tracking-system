import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { COURSES, YEAR_LEVELS } from '@rtms/shared';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (student: any) => void;
}

export function AddStudentDialog({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [course, setCourse] = useState<string>(COURSES[0]);
  const [yearLevel, setYearLevel] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/students', { name, course, yearLevel });
      onCreated(data);
      setName('');
      setCourse(COURSES[0]);
      setYearLevel(1);
      onClose();
    } catch {
      alert('Failed to create student');
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Surname, First Name (e.g. Dela Cruz, Juan)" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Program</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              {COURSES.map((c) => (
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
              {YEAR_LEVELS.map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Add Student'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
