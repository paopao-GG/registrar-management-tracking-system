import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStudentSearch } from '@/hooks/useStudentSearch';
import { Plus, Upload } from 'lucide-react';
import { BulkImportDialog } from './BulkImportDialog';

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

interface Props {
  onSelect: (student: Student) => void;
  onAddNew: () => void;
  onImported?: () => void;
}

export function StudentAutocomplete({ onSelect, onAddNew, onImported }: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { results, isLoading } = useStudentSearch(query);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          placeholder="Search by surname or student number..."
        />
        {isOpen && query.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-60 overflow-auto">
            {isLoading && <div className="p-2 text-sm text-muted-foreground">Searching...</div>}
            {!isLoading && results.length === 0 && (
              <div className="p-2 text-sm text-muted-foreground">No students found</div>
            )}
            {results.map((student) => (
              <button
                key={student._id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                onClick={() => {
                  onSelect(student);
                  setQuery(student.name);
                  setIsOpen(false);
                }}
              >
                <div className="font-medium">{student.name}</div>
                <div className="text-xs text-muted-foreground">
                  {student.studentNumber} · {student.course} - Year {student.yearLevel}
                </div>
              </button>
            ))}
            <div className="flex border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1 justify-start text-primary"
                onClick={() => {
                  setIsOpen(false);
                  onAddNew();
                }}
              >
                <Plus className="h-3 w-3 mr-2" />
                Add New
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1 justify-start text-primary"
                onClick={() => {
                  setIsOpen(false);
                  setImportOpen(true);
                }}
              >
                <Upload className="h-3 w-3 mr-2" />
                Import CSV/XLSX
              </Button>
            </div>
          </div>
        )}
      </div>

      <BulkImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          setImportOpen(false);
          onImported?.();
        }}
      />
    </>
  );
}
