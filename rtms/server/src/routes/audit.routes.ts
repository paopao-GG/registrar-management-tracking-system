import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { prisma } from '../config/db.js';
import { phDayRange } from '@rtams/shared';

// The filters the listing and the clear both work from.
function auditFilter(query: any) {
  const where: any = {};

  if (query.transactionId) where.transactionId = query.transactionId;
  if (query.startDate || query.endDate) {
    where.timestamp = phDayRange(query.startDate, query.endDate);
  }

  return where;
}

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/api/audit-logs', async (request) => {
    const query = request.query as any;
    const where = auditFilter(query);

    const page = Math.max(1, parseInt(query.page || '1') || 1);
    const limit = Math.min(200, Math.max(1, parseInt(query.limit || '50') || 50));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs: logs.map((l: any) => ({ ...l, _id: l.id })), total, page, limit };
  });

  /*
   * Clear the audit log — Admin only.
   *
   * Takes the same filters as the listing, so it removes exactly the
   * entries being shown. Clearing the whole log therefore means choosing
   * All Dates first, which is deliberate: this is the record of who
   * changed what, and nothing rebuilds it once it is gone.
   *
   * Only log rows are removed. AuditLog is the child of both its
   * relations, so transactions and the accounts that acted on them are
   * untouched, and the requests themselves keep their own history.
   */
  app.delete('/api/audit-logs', async (request) => {
    const query = request.query as any;
    const where = auditFilter(query);

    const { count } = await prisma.auditLog.deleteMany({ where });

    // The log cannot record its own clearing, so the server log does.
    request.log.warn(
      {
        userId: request.user.id,
        userName: request.user.name,
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
        deleted: count,
      },
      'audit log cleared'
    );

    return { deleted: count };
  });
}
