import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

export async function logStatusChange(
  transactionId: string,
  action: string,
  previousStatus: string | null,
  newStatus: string,
  performedBy: string,
  performedByName: string,
  tx: Prisma.TransactionClient = prisma
) {
  await tx.auditLog.create({
    data: {
      transactionId,
      action,
      previousStatus,
      newStatus,
      performedBy,
      performedByName,
      timestamp: new Date(),
    },
  });
}
