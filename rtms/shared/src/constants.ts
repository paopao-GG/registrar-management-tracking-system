export const DOCUMENT_TYPES = ['COR', 'COG', 'GMC', 'AUTH', 'OTR'] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DATE_FORMAT = 'MM-dd-yyyy';

export const DATETIME_FORMAT = 'MM-dd-yyyy hh:mm a';

export const COURSES = [
  'Bachelor of Science in Information System',
  'Bachelor of Technology and Livelihood Education Major in Information and Communication Technology',
  'Bachelor of Science in Computer Engineering',
  'Bachelor of Science in Mechanical Technology',
  'Bachelor of Science in Electronics Technology',
  'Bachelor of Science in Information Technology',
  'Bachelor of Secondary Education Major in English',
  'Bachelor of Science in Entrepreneurship',
  'Bachelor of Science in Information Technology Major in Animation',
  'Bachelor of Science in Automotive Technology',
  'Bachelor of Secondary Education Major in Mathematics',
  'Bachelor of Science in Electronics Engineering',
  'Bachelor of Science in Nursing',
  'Bachelor of Elementary Education',
  'Bachelor of Technology and Livelihood Education Major in Home Economics',
  'Bachelor of Science in Computer Science',
  'Bachelor of Science in Electrical Technology',
] as const;

export const COURSE_ALIASES: Record<string, string> = {
  BSIS: 'Bachelor of Science in Information System',

  'BTLED-ICT':
    'Bachelor of Technology and Livelihood Education Major in Information and Communication Technology',

  BSCpE: 'Bachelor of Science in Computer Engineering',

  BSMT: 'Bachelor of Science in Mechanical Technology',

  BSELT: 'Bachelor of Science in Electronics Technology',

  BSIT: 'Bachelor of Science in Information Technology',

  'BSED-English':
    'Bachelor of Secondary Education Major in English',

  BSENTREP: 'Bachelor of Science in Entrepreneurship',

  'BSIT-Animation':
    'Bachelor of Science in Information Technology Major in Animation',

  BSAT: 'Bachelor of Science in Automotive Technology',

  'BSED-Mathematics':
    'Bachelor of Secondary Education Major in Mathematics',

  BSECE: 'Bachelor of Science in Electronics Engineering',

  BSN: 'Bachelor of Science in Nursing',

  BEED: 'Bachelor of Elementary Education',

  'BTLED-HE':
    'Bachelor of Technology and Livelihood Education Major in Home Economics',

  // Spelling used in the Registrar's directory export.
  'BTLEd-HomeEcon':
    'Bachelor of Technology and Livelihood Education Major in Home Economics',

  BSCS: 'Bachelor of Science in Computer Science',

  BSET: 'Bachelor of Science in Electrical Technology',
};

export const YEAR_LEVELS = [1, 2, 3, 4] as const;

export const MAX_BULK_IMPORT_ROWS = 5000;

export function normalizeCourse(input: string): string | null {
  // Drop a trailing school year, e.g. "BSN 2026 - 2027".
  const cleaned = input.trim().replace(/\s+\d{4}\s*-\s*\d{4}$/, '');

  if (!cleaned) return null;

  // Accept the full program name.
  const fullName = COURSES.find(
    (course) => course.toLowerCase() === cleaned.toLowerCase()
  );

  if (fullName) return fullName;

  // Accept the program alias.
  const alias = Object.keys(COURSE_ALIASES).find(
    (key) => key.toLowerCase() === cleaned.toLowerCase()
  );

  return alias ? COURSE_ALIASES[alias] : null;
}
/**
 * Short program name for tables, e.g. "BSIT". Falls back to the
 * value itself when no alias matches.
 */
export function abbreviateCourse(course: string): string {
  const alias = Object.keys(COURSE_ALIASES).find(
    (key) => COURSE_ALIASES[key] === course
  );

  return alias ?? course;
}

/**
 * Year level for a student outside the current roster.
 */
export const NOT_ENROLLED_YEAR_LEVEL = -1;

/**
 * Year level 0 marks an alumni record; NOT_ENROLLED_YEAR_LEVEL marks
 * a student who is not enrolled this semester.
 */
export function formatYearLevel(yearLevel: number): string {
  if (yearLevel === 0) return 'Alumni';
  if (yearLevel === NOT_ENROLLED_YEAR_LEVEL) return 'Not Enrolled';
  return String(yearLevel);
}

export function formatCourseYear(course: string, yearLevel: number): string {
  return `${abbreviateCourse(course)}-${formatYearLevel(yearLevel)}`;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Philippine-time day boundaries for a YYYY-MM-DD range.
 * The end is exclusive (start of the following day).
 */
export function phDayRange(startDate?: string, endDate?: string) {
  const range: { gte?: Date; lt?: Date } = {};

  if (startDate) {
    range.gte = new Date(`${startDate}T00:00:00+08:00`);
  }

  if (endDate) {
    const end = new Date(`${endDate}T00:00:00+08:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    range.lt = end;
  }

  return range;
}
