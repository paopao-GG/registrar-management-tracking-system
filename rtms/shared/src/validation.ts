import { z } from 'zod';

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

export const createStudentSchema = z.object({
  name: z.string().min(1, 'Student name is required'),
  course: z.string().min(1, 'Course is required'),
  yearLevel: z.number().int().min(1).max(4),
});

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
