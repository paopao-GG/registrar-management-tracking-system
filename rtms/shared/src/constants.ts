export const DOCUMENT_TYPES = ['COR', 'COG', 'CMC', 'AUTH', 'OTR'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DATE_FORMAT = 'MM-dd-yyyy';
export const DATETIME_FORMAT = 'MM-dd-yyyy hh:mm a';

export const COURSES = [
  'BSIT',
  'BSCS',
  'BSCpE',
  'BSBA',
  'BSA',
  'BSED',
  'BEED',
  'BSCRIM',
  'BSAGRI',
] as const;

export const YEAR_LEVELS = [1, 2, 3, 4] as const;

export const MAX_BULK_IMPORT_ROWS = 2000;

export function normalizeCourse(input: string): string | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  return COURSES.find((c) => c.toLowerCase() === cleaned.toLowerCase()) ?? null;
}
