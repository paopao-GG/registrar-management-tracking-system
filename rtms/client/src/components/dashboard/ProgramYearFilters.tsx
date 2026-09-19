import { NativeSelect } from '@/components/ui/select';
import { COURSES, YEAR_LEVELS, abbreviateCourse } from '@rtams/shared';

interface Props {
  program: string;
  yearLevel: string;
  onProgramChange: (program: string) => void;
  onYearLevelChange: (yearLevel: string) => void;
  compact?: boolean;
}

/* Program and year level filters for the dashboard transaction lists. */
export function ProgramYearFilters({
  program,
  yearLevel,
  onProgramChange,
  onYearLevelChange,
  compact = true,
}: Props) {
  return (
    <>
      <NativeSelect
        compact={compact}
        aria-label="Program"
        value={program}
        onChange={(e) => onProgramChange(e.target.value)}
        className="md:w-36"
      >
        <option value="">All Programs</option>
        {COURSES.map((c: string) => (
          <option key={c} value={c} title={c}>
            {abbreviateCourse(c)}
          </option>
        ))}
      </NativeSelect>

      <NativeSelect
        compact={compact}
        aria-label="Year level"
        value={yearLevel}
        onChange={(e) => onYearLevelChange(e.target.value)}
        className="md:w-32"
      >
        <option value="">All Years</option>
        {YEAR_LEVELS.map((y: number) => (
          <option key={y} value={y}>
            Year {y}
          </option>
        ))}
        {/* Alumni records are stored with year level 0. */}
        <option value="0">Alumni</option>
      </NativeSelect>
    </>
  );
}

/* Query params for the selected program and year level. */
export function programYearParams(program: string, yearLevel: string) {
  const params: Record<string, string> = {};
  if (program) params.course = program;
  if (yearLevel !== '') params.yearLevel = yearLevel;
  return params;
}
