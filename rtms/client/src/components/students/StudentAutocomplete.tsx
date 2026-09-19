import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useStudentSearch } from '@/hooks/useStudentSearch';
import { Search, Upload } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
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
  // Name of a student picked outside the search box (e.g. a newly added alumni).
  selectedName?: string;
}

export function StudentAutocomplete({
  onSelect,
  onImported,
  resetKey,
  selectedName,
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

  // Show a student chosen elsewhere as the current selection.
  useEffect(() => {
    if (!selectedName) return;

    setQuery(selectedName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [selectedName]);

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
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {isLoading && query.length > 0 && (
          <Spinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          className="pl-9 pr-9"
          role="combobox"
          aria-expanded={isOpen && query.length > 0}
          aria-autocomplete="list"
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
          placeholder="Search by surname or student number…"
        />

        {isOpen && query.length > 0 && (
          <div
            role="listbox"
            className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border/80 bg-card py-1 shadow-float animate-in fade-in-0 slide-in-from-top-1"
          >
            {isLoading && results.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                <Spinner size="sm" />
                Searching…
              </div>
            )}

            {!isLoading && results.length === 0 && (
              <div className="px-3 py-2.5 text-sm text-muted-foreground">
                No students found
              </div>
            )}

            {results.map((student, index) => (
              <button
                key={student._id}
                type="button"
                role="option"
                aria-selected={highlightedIndex === index}
                className={cn(
                  'w-full border-l-2 px-3 py-2 text-left text-sm transition-colors',
                  highlightedIndex === index
                    ? 'border-seal bg-seal/10'
                    : 'border-transparent hover:bg-accent'
                )}
                onMouseEnter={() =>
                  setHighlightedIndex(index)
                }
                onClick={() => handleSelect(student)}
              >
                <div className="font-medium">
                  {student.name}
                </div>

                <div className="text-xs text-muted-foreground">
                  <span className="font-mono">{student.studentNumber}</span> ·{' '}
                  {formatCourseYear(student.course, student.yearLevel)}
                </div>
              </button>
            ))}

            <div className="mt-1 flex border-t px-1 pt-1">
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
                <Upload className="h-3.5 w-3.5" />
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