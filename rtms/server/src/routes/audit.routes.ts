import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { prisma } from '../config/db.js';
import { phDayRange } from '@rtams/shared';

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/api/audit-logs', async (request) => {
    const query = request.query as any;
    const where: any = {};

    if (query.transactionId) where.transactionId = query.transactionId;
    if (query.startDate || query.endDate) {
      where.timestamp = phDayRange(query.startDate, query.endDate);
    }

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
}
