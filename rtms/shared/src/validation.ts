import { z } from 'zod';
import { MAX_BULK_IMPORT_ROWS } from './constants.js';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'staff']),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'staff']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

const optionalTrimmedString = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  z.string().min(1).optional(),
);

const normalizeSex = (val: unknown) => {
  if (typeof val !== 'string') return val;
  const v = val.trim().toUpperCase();
  if (!v) return undefined;
  if (v === 'MALE') return 'M';
  if (v === 'FEMALE') return 'F';
  return v;
};

const sexEnum = z.enum(['M', 'F'], {
  errorMap: (issue, ctx) => ({
    message: issue.code === 'invalid_type' && ctx.data === undefined ? 'Sex is required' : 'Sex must be M or F',
  }),
});

const requiredSexField = z.preprocess(normalizeSex, sexEnum);

/**
 * True for an imported cell that holds no data. Registrar exports
 * fill empty cells with placeholders such as "---" or "N/A".
 */
export function isBlankImportValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  const v = String(value).trim();
  return v === '' || /^[-\u2013\u2014.\s]+$/.test(v) || /^(n\/?a|none)$/i.test(v);
}

// Trimmed cell text, or undefined for blanks and placeholders.
const importCell = (val: unknown) =>
  isBlankImportValue(val) ? undefined : String(val).trim();

// Optional for bulk imports, where the Registrar file may leave it blank.
const sexField = z.preprocess((val) => normalizeSex(importCell(val)), sexEnum.optional());

export const createStudentSchema = z
  .object({
    lastName: z.string().trim().min(1, 'Last name is required'),
    firstName: z.string().trim().min(1, 'First name is required'),
    middleName: optionalTrimmedString,
    studentNumber: optionalTrimmedString,
    email: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim() : val),
      z.string().email('Invalid email').optional(),
    ),
    sex: requiredSexField,
    contactNumber: optionalTrimmedString,
    course: z.string().min(1, 'Course is required'),
    isAlumni: z.boolean().optional(),
    notEnrolled: z.boolean().optional(),
    yearLevel: z.number().int().min(1).max(4).optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.isAlumni && !val.notEnrolled && val.yearLevel === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['yearLevel'],
        message: 'Year level is required',
      });
    }
  });

const yearLevelFromAny = z.preprocess((val) => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val.trim());
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
}, z.number().int('Year level must be a whole number').min(1, 'Year level must be 1-4').max(4, 'Year level must be 1-4'));

export const bulkImportRowSchema = z.object({
  studentNumber: z.string().trim().min(1, 'Student number is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: z.preprocess(importCell, z.string().optional()),
  email: z.preprocess(importCell, z.string().email('Invalid email').optional()),
  sex: sexField,
  contactNumber: z.preprocess(importCell, z.string().optional()),
  course: z.string().trim().min(1, 'Program is required'),
  yearLevel: yearLevelFromAny,
});

export const bulkImportSchema = z
  .array(bulkImportRowSchema)
  .min(1, 'At least one row is required')
  .max(MAX_BULK_IMPORT_ROWS, `Cannot import more than ${MAX_BULK_IMPORT_ROWS} rows at once`);

export const createTransactionSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  requestedDocuments: z.object({
    COR: z.number().int().min(0),
    COG: z.number().int().min(0),
    GMC: z.number().int().min(0),
    AUTH: z.number().int().min(0),
    OTR: z.number().int().min(0),
  }),
  others: z.string().default(''),
  othersCount: z.number().int().min(0).default(0),
});

export const releaseTransactionSchema = z.object({
  releasedTo: z.string().min(1, 'Claimer name is required'),
  signature: z.string().min(1, 'Signature is required'),
});

export const bulkIdsSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1, 'Select at least one transaction')
    .max(200, 'Cannot process more than 200 transactions at once'),
});

export const bulkReleaseSchema = bulkIdsSchema.extend({
  releasedTo: z.string().trim().min(1, 'Claimer name is required'),
  signature: z.string().min(1, 'Signature is required'),
  // Tablet signing session to mark confirmed along with the release.
  sessionId: z.string().min(1).optional(),
});

export const reportFiltersSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  format: z.enum(['json', 'arta', 'bup']).default('json'),
});
