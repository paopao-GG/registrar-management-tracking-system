export interface IStudent {
  _id: string;
  studentNumber: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  email: string | null;
  course: string;
  yearLevel: number;
  createdAt: Date;
}

export interface CreateStudentDTO {
  lastName: string;
  firstName: string;
  middleName?: string;
  studentNumber?: string;
  email?: string;
  course: string;
  yearLevel: number;
}

export interface BulkImportRow {
  studentNumber: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  email?: string;
  course: string;
  yearLevel: number;
}

export interface BulkImportSkipped {
  row: number;
  studentNumber: string;
  reason: 'duplicate';
}

export interface BulkImportFailed {
  row: number;
  reason: string;
}

export interface BulkImportResult {
  created: number;
  skipped: BulkImportSkipped[];
  failed: BulkImportFailed[];
}

export function formatStudentName(s: {
  lastName: string;
  firstName: string;
  middleName?: string | null;
}): string {
  const middle = s.middleName?.trim();
  return middle
    ? `${s.lastName}, ${s.firstName} ${middle}`
    : `${s.lastName}, ${s.firstName}`;
}
