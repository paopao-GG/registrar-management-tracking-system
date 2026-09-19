import type { Transaction } from '@prisma/client';
import { prisma } from '../config/db.js';
import { logStatusChange } from './audit.service.js';
import { toDocColumns, toApiTransaction } from '../utils/doc-mapper.js';
import { formatStudentName, phDayRange } from '@rtams/shared';

interface CreateInput {
  studentId: string;
  requestedDocuments: { COR: number; COG: number; GMC: number; AUTH: number; OTR: number };
  others: string;
  othersCount: number;
  userId: string;
  userName: string;
}

interface Actor {
  id: string;
  name: string;
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

/*
 * Move a set of transactions from one status to the next in a
 * single database transaction. Every transaction must currently be
 * in `from`; otherwise nothing is changed.
 */
async function transition(
  ids: string[],
  from: string,
  to: string,
  action: string,
  actor: Actor,
  buildData: (t: Transaction, now: Date) => Record<string, unknown>
) {
  const uniqueIds = Array.from(new Set(ids));

  return prisma.$transaction(async (tx) => {
    const transactions = await tx.transaction.findMany({
      where: { id: { in: uniqueIds } },
    });

    if (transactions.length !== uniqueIds.length) {
      throw new Error('Transaction not found');
    }

    const invalid = transactions.filter((t) => t.status !== from);

    if (invalid.length > 0) {
      const names = invalid.map((t) => t.studentName).join(', ');
      throw new Error(
        `Transaction must be in ${from} status to ${action.toLowerCase()}: ${names}`
      );
    }

    const now = new Date();
    const updated = [];

    for (const t of transactions) {
      updated.push(
        await tx.transaction.update({
          where: { id: t.id },
          data: { status: to, ...buildData(t, now) },
        })
      );

      await logStatusChange(t.id, action, from, to, actor.id, actor.name, tx);
    }

    return updated.map(toApiTransaction);
  }, { timeout: 30_000 });
}

export function bulkStartProcessing(ids: string[], actor: Actor) {
  return transition(ids, 'Pending', 'Processing', 'Started', actor, () => ({}));
}

export function bulkSign(ids: string[], actor: Actor) {
  return transition(ids, 'Processing', 'Ready for Release', 'Signed', actor, (t, now) => ({
    reviewedBy: actor.id,
    reviewedByName: actor.name,
    reviewedAt: now,
    duration: now.getTime() - t.preparedAt.getTime(),
  }));
}

export function bulkRelease(
  ids: string[],
  releasedTo: string,
  signature: string,
  actor: Actor
) {
  return transition(ids, 'Ready for Release', 'Released', 'Released', actor, (_t, now) => ({
    releasedTo,
    signature,
    releasedAt: now,
  }));
}

export async function startProcessing(transactionId: string, userId: string, userName: string) {
  const [transaction] = await bulkStartProcessing([transactionId], { id: userId, name: userName });
  return transaction;
}

export async function signTransaction(transactionId: string, reviewerId: string, reviewerName: string) {
  const [transaction] = await bulkSign([transactionId], { id: reviewerId, name: reviewerName });
  return transaction;
}

export async function releaseTransaction(
  transactionId: string,
  releasedTo: string,
  signature: string,
  userId: string,
  userName: string
) {
  const [transaction] = await bulkRelease([transactionId], releasedTo, signature, {
    id: userId,
    name: userName,
  });
  return transaction;
}

interface QueryFilters {
  status?: string;
  preparedBy?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  course?: string;
  yearLevel?: number;
  page?: number;
  limit?: number;
}

export async function getTransactions(filters: QueryFilters) {
  const where: any = {};

  if (filters.status) where.status = filters.status;
  if (filters.preparedBy) where.preparedBy = filters.preparedBy;
  if (filters.search) where.studentName = { contains: filters.search, mode: 'insensitive' };
  if (filters.course) where.studentCourse = filters.course;
  if (filters.yearLevel !== undefined && !Number.isNaN(filters.yearLevel)) {
    where.studentYearLevel = filters.yearLevel;
  }

  if (filters.startDate || filters.endDate) {
    where.preparedAt = phDayRange(filters.startDate, filters.endDate);
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
