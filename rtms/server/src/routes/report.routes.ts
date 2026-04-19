import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { reportFiltersSchema } from '@rtams/shared';
import { generateReport } from '../services/report.service.js';
import { toCsv } from '../utils/csv.js';

export async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/api/reports', async (request, reply) => {
    const query = request.query as any;
    const parsed = reportFiltersSchema.safeParse({
      startDate: query.startDate,
      endDate: query.endDate,
    });

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const report = await generateReport(parsed.data.startDate, parsed.data.endDate);

    if (query.format === 'csv') {
      const csvRows = report.rows.map((row: any) => ({
        'External Client Name': row.clientName,
        'Service Availed': row.serviceAvailed,
        'Day of Service Completion': row.completionDate,
      }));

      const csv = toCsv(csvRows);
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename=report-${parsed.data.startDate}-to-${parsed.data.endDate}.csv`);
      return csv;
    }

    return report;
  });
}
