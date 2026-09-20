import { prisma } from '../config/db.js';
import {
  DOCUMENT_TYPES,
  formatCourseYear,
  formatDuration,
  phDayRange,
  type ArtaReportRow,
  type BupReportRow,
  type NameDateTime,
} from '@rtams/shared';
import { toDocumentsObject } from '../utils/doc-mapper.js';

const dateFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});

const timeFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Manila',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function formatDate(date: Date | null) {
  return date ? dateFormat.format(date) : '';
}

function formatDateTime(date: Date | null) {
  return date ? `${dateFormat.format(date)} ${timeFormat.format(date)}` : '';
}

function nameDateTime(name: string | null, date: Date | null): NameDateTime {
  return { name: name ?? '', dateTime: formatDateTime(date) };
}

async function findReleased(startDate: string, endDate: string) {
  return prisma.transaction.findMany({
    where: {
      status: 'Released',
      releasedAt: phDayRange(startDate, endDate),
    },
    include: {
      student: {
        select: { email: true, contactNumber: true, sex: true },
      },
    },
    orderBy: { releasedAt: 'asc' },
  });
}

type ReleasedTransaction = Awaited<ReturnType<typeof findReleased>>[number];

function servicesSummary(t: ReleasedTransaction) {
  const docs = toDocumentsObject(t);
  const services: string[] = DOCUMENT_TYPES.filter((d) => docs[d] > 0).map(
    (d) => (docs[d] > 1 ? `${d} (${docs[d]})` : d)
  );

  if (t.othersCount > 0 && t.others) {
    services.push(t.othersCount > 1 ? `${t.others} (${t.othersCount})` : t.others);
  }

  return services.join(', ');
}

/*
 * The signature is only carried for the logbook file. The JSON
 * preview has no signature column, so it would be a base64 PNG
 * per row for nothing.
 */
function toArtaRow(
  t: ReleasedTransaction,
  includeSignature = false
): ArtaReportRow {
  return {
    clientName: t.studentName,
    requestedDocuments: servicesSummary(t),
    contactNumber: t.student.contactNumber ?? '',
    email: t.student.email ?? '',
    transactionDate: formatDate(t.releasedAt),
    signature: includeSignature ? t.signature : null,
  };
}

function toBupRow(t: ReleasedTransaction): BupReportRow {
  const docs = toDocumentsObject(t);

  return {
    date: formatDate(t.preparedAt),
    name: t.studentName,
    sex: t.student.sex ?? '',
    courseYear: formatCourseYear(t.studentCourse, t.studentYearLevel),
    ...docs,
    OTHERS: t.othersCount,
    othersLabel: t.othersCount > 0 ? t.others : '',
    preparedBy: nameDateTime(t.preparedByName, t.preparedAt),
    reviewedBy: nameDateTime(t.reviewedByName, t.reviewedAt),
    duration: t.duration ? formatDuration(t.duration) : '',
    releasedTo: nameDateTime(t.releasedTo, t.releasedAt),
    signature: t.signature,
  };
}

export async function generateReport(startDate: string, endDate: string) {
  const transactions = await findReleased(startDate, endDate);

  return {
    // Called directly: map would pass the index as includeSignature.
    rows: transactions.map((t) => toArtaRow(t)),
    period: { startDate, endDate },
    totalTransactions: transactions.length,
  };
}

export async function generateArtaRows(startDate: string, endDate: string) {
  const transactions = await findReleased(startDate, endDate);
  return transactions.map((t) => toArtaRow(t, true));
}

export async function generateBupRows(startDate: string, endDate: string) {
  const transactions = await findReleased(startDate, endDate);
  return transactions.map(toBupRow);
}
