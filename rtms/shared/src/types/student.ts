import { NOT_ENROLLED_YEAR_LEVEL } from '../constants.js';

export interface IStudent {
  _id: string;
  studentNumber: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  email: string | null;
  sex: string | null;
  contactNumber: string | null;
  course: string;
  yearLevel: number;
  isAlumni: boolean;
  createdAt: Date;
}

export interface CreateStudentDTO {
  lastName: string;
  firstName: string;
  middleName?: string;
  studentNumber?: string;
  email?: string;
  sex?: 'M' | 'F';
  contactNumber?: string;
  course: string;
  yearLevel?: number;
  isAlumni?: boolean;
  notEnrolled?: boolean;
}

export interface BulkImportRow {
  studentNumber: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  email?: string;
  sex?: string;
  contactNumber?: string;
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
  updated: number;
  reactivated: number;
  deactivated: number;
  skipped: BulkImportSkipped[];
  failed: BulkImportFailed[];
}

/**
 * Year level for the current semester. A student missing from the
 * current roster is Not Enrolled; their stored year level is kept.
 */
export function currentYearLevel(s: {
  yearLevel: number;
  active: boolean;
  isAlumni: boolean;
}): number {
  return s.active || s.isAlumni ? s.yearLevel : NOT_ENROLLED_YEAR_LEVEL;
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
