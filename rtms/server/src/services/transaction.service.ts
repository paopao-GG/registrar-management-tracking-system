import { Prisma, type Transaction } from '@prisma/client';
import { prisma } from '../config/db.js';
import { logStatusChange } from './audit.service.js';
import { toDocColumns, toApiTransaction } from '../utils/doc-mapper.js';
import { currentYearLevel, formatStudentName, phDayRange } from '@rtams/shared';

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
      studentYearLevel: currentYearLevel(student),
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

/* A problem the user can fix, e.g. acting on a request whose status already changed. */
export class TransitionError extends Error {}

/*
 * Move a set of transactions from one status to the next. The
 * updates, their audit entries, and any `extra` writes commit
 * together in one batch transaction. Every transaction must
 * currently be in `from`; otherwise nothing is changed.
 */
async function transition(
  ids: string[],
  from: string,
  to: string,
  action: string,
  actor: Actor,
  buildData: (t: Transaction, now: Date) => Record<string, unknown>,
  extra: Prisma.PrismaPromise<unknown>[] = []
) {
  const uniqueIds = Array.from(new Set(ids));

  const transactions = await prisma.transaction.findMany({
    where: { id: { in: uniqueIds } },
  });

  if (transactions.length !== uniqueIds.length) {
    throw new TransitionError('Transaction not found');
  }

  const invalid = transactions.filter((t) => t.status !== from);

  if (invalid.length > 0) {
    const names = invalid.map((t) => t.studentName).join(', ');
    throw new TransitionError(
      `Transaction must be in ${from} status to ${action.toLowerCase()}: ${names}`
    );
  }

  const now = new Date();

  const updates = transactions.map((t) =>
    prisma.transaction.update({
      // Matching on status fails the batch if someone else moved it first.
      where: { id: t.id, status: from },
      data: { status: to, ...buildData(t, now) },
    })
  );

  const auditEntries = prisma.auditLog.createMany({
    data: transactions.map((t) => ({
      transactionId: t.id,
      action,
      previousStatus: from,
      newStatus: to,
      performedBy: actor.id,
      performedByName: actor.name,
      timestamp: now,
    })),
  });

  try {
    const results = await prisma.$transaction([...updates, auditEntries, ...extra]);
    return (results.slice(0, updates.length) as Transaction[]).map(toApiTransaction);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new TransitionError(
        'Some of these requests were just updated by someone else. Refresh and try again.'
      );
    }
    throw err;
  }
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
  actor: Actor,
  sessionId?: string
) {
  // Confirm the tablet session in the same commit, so the tablet
  // never keeps waiting on a release that already happened.
  const confirmSession = sessionId
    ? [
        prisma.signingSession.updateMany({
          where: { id: sessionId, status: 'signed' },
          data: { status: 'confirmed' },
        }),
      ]
    : [];

  return transition(
    ids,
    'Ready for Release',
    'Released',
    'Released',
    actor,
    (_t, now) => ({
      releasedTo,
      signature,
      releasedAt: now,
    }),
    confirmSession
  );
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
  // Also return per-status totals for the dashboard tiles.
  includeCounts?: boolean;
}

export async function getTransactions(filters: QueryFilters) {
  // Filters shared by the list and the status counts.
  const baseWhere: any = {};

  if (filters.preparedBy) baseWhere.preparedBy = filters.preparedBy;
  if (filters.course) baseWhere.studentCourse = filters.course;
  if (filters.yearLevel !== undefined && !Number.isNaN(filters.yearLevel)) {
    baseWhere.studentYearLevel = filters.yearLevel;
  }

  if (filters.startDate || filters.endDate) {
    baseWhere.preparedAt = phDayRange(filters.startDate, filters.endDate);
  }

  const where: any = { ...baseWhere };

  if (filters.status) where.status = filters.status;
  if (filters.search) where.studentName = { contains: filters.search, mode: 'insensitive' };

  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const skip = (page - 1) * limit;

  const [transactions, total, statusGroups] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { preparedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
    filters.includeCounts
      ? prisma.transaction.groupBy({ by: ['status'], where: baseWhere, _count: { _all: true } })
      : null,
  ]);

  const counts = statusGroups
    ? Object.fromEntries(statusGroups.map((g) => [g.status, g._count._all]))
    : undefined;

  return { transactions: transactions.map(toApiTransaction), total, page, limit, counts };
}
