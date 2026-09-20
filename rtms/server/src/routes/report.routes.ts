import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { reportFiltersSchema } from '@rtams/shared';
import {
  generateArtaRows,
  generateBupRows,
  generateReport,
} from '../services/report.service.js';
import { buildArtaWorkbook, buildBupWorkbook } from '../utils/logbook-xlsx.js';

const XLSX_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function reportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/api/reports', async (request, reply) => {
    const parsed = reportFiltersSchema.safeParse(request.query);

    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const { startDate, endDate, format } = parsed.data;

    if (format === 'json') {
      return generateReport(startDate, endDate);
    }

    const buffer =
      format === 'arta'
        ? await buildArtaWorkbook(await generateArtaRows(startDate, endDate))
        : await buildBupWorkbook(await generateBupRows(startDate, endDate));

    const name = format === 'arta' ? 'ARTA-Logbook' : 'BUP-Logbook';

    reply.header('Content-Type', XLSX_TYPE);
    reply.header(
      'Content-Disposition',
      `attachment; filename=${name}-${startDate}-to-${endDate}.xlsx`
    );
    return reply.send(buffer);
  });
}
