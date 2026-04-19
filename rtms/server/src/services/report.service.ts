import { prisma } from '../config/db.js';
import { DOCUMENT_TYPES } from '@rtams/shared';

export async function generateReport(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const transactions = await prisma.transaction.findMany({
    where: {
      status: 'Released',
      releasedAt: { gte: start, lte: end },
    },
    orderBy: { releasedAt: 'desc' },
  });

  const docKeyMap: Record<string, string> = {
    COR: 'docCOR',
    COG: 'docCOG',
    CMC: 'docCMC',
    AUTH: 'docAUTH',
    OTR: 'docOTR',
  };

  const rows = transactions.map((t: any) => {
    const services: string[] = [];
    for (const docType of DOCUMENT_TYPES) {
      const key = docKeyMap[docType] as keyof typeof t;
      if ((t[key] as number) > 0) {
        services.push(docType);
      }
    }
    if (t.othersCount > 0 && t.others) {
      services.push(t.others);
    }

    const completionDate = t.releasedAt
      ? t.releasedAt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
      : '';

    return {
      clientName: t.studentName,
      serviceAvailed: services.join(', '),
      completionDate,
    };
  });

  return {
    rows,
    period: { startDate, endDate },
    totalTransactions: transactions.length,
  };
}
