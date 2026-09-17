import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStudentSearch } from '@/hooks/useStudentSearch';
import { Upload } from 'lucide-react';
import { formatCourseYear } from '@rtams/shared';
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
  onImported?: () => void;
  resetKey?: number;
}

export function StudentAutocomplete({
  onSelect,
  onImported,
  resetKey,
}: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const { results, isLoading } = useStudentSearch(query);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Clear the search box when the parent form is reset.
  useEffect(() => {
    if (resetKey === undefined) return;

    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [resetKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted student whenever the search results change.
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [results]);

  const handleSelect = (student: Student) => {
    onSelect(student);
    setQuery(student.name);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (!isOpen || query.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();

      if (results.length === 0) return;

      setHighlightedIndex((current) =>
        current < results.length - 1 ? current + 1 : 0
      );
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();

      if (results.length === 0) return;

      setHighlightedIndex((current) =>
        current > 0 ? current - 1 : results.length - 1
      );
    }

    if (e.key === 'Enter') {
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < results.length
      ) {
        e.preventDefault();
        handleSelect(results[highlightedIndex]);
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() =>
            query.length > 0 && setIsOpen(true)
          }
          onKeyDown={handleKeyDown}
          placeholder="Search by surname or student number..."
        />

        {isOpen && query.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg max-h-60 overflow-auto">
            {isLoading && (
              <div className="p-2 text-sm text-muted-foreground">
                Searching...
              </div>
            )}

            {!isLoading && results.length === 0 && (
              <div className="p-2 text-sm text-muted-foreground">
                No students found
              </div>
            )}

            {results.map((student, index) => (
              <button
                key={student._id}
                type="button"
                className={`w-full text-left px-3 py-2 text-sm transition-colors border-l-4 ${
                  highlightedIndex === index
                    ? 'bg-primary/15 border-primary'
                    : 'border-transparent hover:bg-accent'
                }`}
                onMouseEnter={() =>
                  setHighlightedIndex(index)
                }
                onClick={() => handleSelect(student)}
              >
                <div className="font-medium">
                  {student.name}
                </div>

                <div className="text-xs text-muted-foreground">
                  {student.studentNumber} ·{' '}
                  {formatCourseYear(student.course, student.yearLevel)}
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
                  setHighlightedIndex(-1);
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