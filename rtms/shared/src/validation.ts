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

export const createStudentSchema = z.object({
  lastName: z.string().trim().min(1, 'Last name is required'),
  firstName: z.string().trim().min(1, 'First name is required'),
  middleName: optionalTrimmedString,
  studentNumber: optionalTrimmedString,
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().email('Invalid email').optional(),
  ),
  course: z.string().min(1, 'Course is required'),
  yearLevel: z.number().int().min(1).max(4),
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
  middleName: optionalTrimmedString,
  email: z.preprocess(
    (val) => (typeof val === 'string' ? val.trim() : val),
    z.string().email('Invalid email').optional(),
  ),
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
    CMC: z.number().int().min(0),
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

export const reportFiltersSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});
