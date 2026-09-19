import { useState, type FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NativeSelect } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';
import { COURSES, YEAR_LEVELS, abbreviateCourse } from '@rtams/shared';

interface Props {
  open: boolean;
  mode?: 'student' | 'alumni';
  onClose: () => void;
  onCreated: (student: any) => void;
}

export function AddStudentDialog({ open, mode = 'student', onClose, onCreated }: Props) {
  const isAlumni = mode === 'alumni';

  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [sex, setSex] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [course, setCourse] = useState<string>(COURSES[0]);
  const [yearLevel, setYearLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const reset = () => {
    setLastName('');
    setFirstName('');
    setMiddleName('');
    setStudentNumber('');
    setEmail('');
    setSex('');
    setContactNumber('');
    setCourse(COURSES[0]);
    setYearLevel(1);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { lastName, firstName, sex, course };
      if (isAlumni) {
        payload.isAlumni = true;
      } else {
        payload.yearLevel = yearLevel;
      }
      if (middleName.trim()) payload.middleName = middleName.trim();
      if (studentNumber.trim()) payload.studentNumber = studentNumber.trim();
      if (email.trim()) payload.email = email.trim();
      if (contactNumber.trim()) payload.contactNumber = contactNumber.trim();
      const { data } = await api.post('/students', payload);
      onCreated(data);
      toast.success(isAlumni ? 'Alumni added' : 'Student added', { description: `${firstName} ${lastName}` });
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? `Failed to add ${isAlumni ? 'alumni' : 'student'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{isAlumni ? 'Add Alumni Request' : 'Add New Student'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Last Name</label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">First Name</label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium">Middle Name <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Input value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Student Number <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="e.g. 2023-0000-00001" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sex</label>
              <NativeSelect value={sex} onChange={(e) => setSex(e.target.value)} required>
                <option value="" disabled>Select…</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Number <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} placeholder="e.g. 09171234567" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">BU Email <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Program</label>
            <NativeSelect
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              {COURSES.map((c: string) => (
                <option key={c} value={c} title={c}>{abbreviateCourse(c)}</option>
              ))}
            </NativeSelect>
          </div>
          {!isAlumni && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Year Level</label>
              <NativeSelect
                value={yearLevel}
                onChange={(e) => setYearLevel(Number(e.target.value))}
              >
                {YEAR_LEVELS.map((y: number) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </NativeSelect>
            </div>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in-0">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            {loading ? 'Saving…' : isAlumni ? 'Add Alumni' : 'Add Student'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
