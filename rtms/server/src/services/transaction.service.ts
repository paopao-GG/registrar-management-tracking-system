import { prisma } from '../config/db.js';
import { logStatusChange } from './audit.service.js';
import { toDocColumns, toApiTransaction } from '../utils/doc-mapper.js';
import { formatStudentName } from '@rtams/shared';

interface CreateInput {
  studentId: string;
  requestedDocuments: { COR: number; COG: number; CMC: number; AUTH: number; OTR: number };
  others: string;
  othersCount: number;
  userId: string;
  userName: string;
}

export async function createTransaction(input: CreateInput) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new Error('Student not found');

  const now = new Date();
  const transaction = await prisma.transaction.create({
    data: {
      studentId: student.id,
      studentName: formatStudentName(student),
      studentCourse: student.course,
      studentYearLevel: student.yearLevel,
      ...toDocColumns(input.requestedDocuments),
      others: input.others,
      othersCount: input.othersCount,
      status: 'Pending',
      preparedBy: input.userId,
      preparedByName: input.userName,
      preparedAt: now,
    },
  });

  await logStatusChange(
    transaction.id,
    'Created',
    null,
    'Pending',
    input.userId,
    input.userName
  );

  return toApiTransaction(transaction);
}

export async function signTransaction(transactionId: string, reviewerId: string, reviewerName: string) {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw new Error('Transaction not found');
  if (transaction.status !== 'Processing') {
    throw new Error('Transaction must be in Processing status to sign');
  }

  const now = new Date();
  const duration = now.getTime() - transaction.preparedAt.getTime();

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'Ready for Release',
      reviewedBy: reviewerId,
      reviewedByName: reviewerName,
      reviewedAt: now,
      duration,
    },
  });

  await logStatusChange(
    transactionId,
    'Signed',
    'Processing',
    'Ready for Release',
    reviewerId,
    reviewerName
  );

  return toApiTransaction(updated);
}

export async function releaseTransaction(
  transactionId: string,
  releasedTo: string,
  signature: string,
  userId: string,
  userName: string
) {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw new Error('Transaction not found');
  if (transaction.status !== 'Ready for Release') {
    throw new Error('Transaction must be in Ready for Release status to release');
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: 'Released',
      releasedTo,
      signature,
      releasedAt: new Date(),
    },
  });

  await logStatusChange(
    transactionId,
    'Released',
    'Ready for Release',
    'Released',
    userId,
    userName
  );

  return toApiTransaction(updated);
}

export async function startProcessing(transactionId: string, userId: string, userName: string) {
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) throw new Error('Transaction not found');
  if (transaction.status !== 'Pending') {
    throw new Error('Transaction must be in Pending status to start processing');
  }

  const updated = await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'Processing' },
  });

  await logStatusChange(transactionId, 'Started', 'Pending', 'Processing', userId, userName);
  return toApiTransaction(updated);
}

interface QueryFilters {
  status?: string;
  preparedBy?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export async function getTransactions(filters: QueryFilters) {
  const where: any = {};

  if (filters.status) where.status = filters.status;
  if (filters.preparedBy) where.preparedBy = filters.preparedBy;
  if (filters.search) where.studentName = { contains: filters.search, mode: 'insensitive' };

  if (filters.startDate || filters.endDate) {
    where.preparedAt = {};
    if (filters.startDate) where.preparedAt.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.preparedAt.lte = end;
    }
  }

  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { preparedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return { transactions: transactions.map(toApiTransaction), total, page, limit };
}
