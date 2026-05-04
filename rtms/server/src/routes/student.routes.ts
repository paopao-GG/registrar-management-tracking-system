import { FastifyInstance } from 'fastify';
import { prisma } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import {
  createStudentSchema,
  bulkImportSchema,
  formatStudentName,
  normalizeCourse,
  type BulkImportResult,
  type BulkImportSkipped,
  type BulkImportFailed,
} from '@rtams/shared';

function toApiStudent(s: any) {
  return {
    _id: s.id,
    studentNumber: s.studentNumber,
    lastName: s.lastName,
    firstName: s.firstName,
    middleName: s.middleName,
    email: s.email,
    course: s.course,
    yearLevel: s.yearLevel,
    name: formatStudentName(s),
    createdAt: s.createdAt,
  };
}

export async function studentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/api/students', async (request) => {
    const { q } = request.query as { q?: string };
    const term = q?.trim();
    const where = term
      ? {
          OR: [
            { lastName: { contains: term, mode: 'insensitive' as const } },
            { firstName: { contains: term, mode: 'insensitive' as const } },
            { studentNumber: { contains: term, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const students = await prisma.student.findMany({
      where,
      take: 10,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    return students.map(toApiStudent);
  });

  app.post('/api/students', async (request, reply) => {
    const parsed = createStudentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const course = normalizeCourse(parsed.data.course);
    if (!course) {
      return reply.status(400).send({ error: `Invalid program '${parsed.data.course}'` });
    }

    try {
      const student = await prisma.student.create({
        data: {
          studentNumber: parsed.data.studentNumber ?? `MANUAL-${Date.now().toString(36)}`,
          lastName: parsed.data.lastName,
          firstName: parsed.data.firstName,
          middleName: parsed.data.middleName ?? null,
          email: parsed.data.email ?? null,
          course,
          yearLevel: parsed.data.yearLevel,
        },
      });
      return reply.status(201).send(toApiStudent(student));
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return reply.status(409).send({ error: 'Student number already exists' });
      }
      throw err;
    }
  });

  app.post('/api/students/bulk', async (request, reply) => {
    const parsed = bulkImportSchema.safeParse(request.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const rowIdx = typeof issue.path[0] === 'number' ? issue.path[0] : null;
      const field = issue.path.slice(1).join('.');
      const prefix = rowIdx !== null ? `row ${rowIdx + 2}` : 'request';
      return reply.status(400).send({
        error: `${prefix}${field ? ` (${field})` : ''}: ${issue.message}`,
      });
    }

    const failed: BulkImportFailed[] = [];

    // Stage 1: per-row normalization. Keep row numbers (CSV row = index + 2 because of header).
    type Staged = {
      rowNumber: number;
      data: {
        studentNumber: string;
        lastName: string;
        firstName: string;
        middleName: string | null;
        email: string | null;
        course: string;
        yearLevel: number;
      };
    };
    const staged: Staged[] = [];
    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const rowNumber = i + 2;
      const course = normalizeCourse(row.course);
      if (!course) {
        failed.push({ row: rowNumber, reason: `invalid program '${row.course}'` });
        continue;
      }
      staged.push({
        rowNumber,
        data: {
          studentNumber: row.studentNumber,
          lastName: row.lastName,
          firstName: row.firstName,
          middleName: row.middleName ?? null,
          email: row.email ?? null,
          course,
          yearLevel: row.yearLevel,
        },
      });
    }

    // Stage 2: in-batch dedup by studentNumber. Last-write-wins; earlier dupes go to `failed`.
    const seen = new Map<string, Staged>();
    for (const s of staged) {
      const prior = seen.get(s.data.studentNumber);
      if (prior) {
        failed.push({
          row: prior.rowNumber,
          reason: `duplicate student number '${prior.data.studentNumber}' within file (kept row ${s.rowNumber})`,
        });
      }
      seen.set(s.data.studentNumber, s);
    }
    const deduped = Array.from(seen.values());

    // Stage 3: pre-query existing studentNumbers so we can attribute duplicates to row numbers.
    const skipped: BulkImportSkipped[] = [];
    let toCreate = deduped;
    if (deduped.length > 0) {
      const existing = await prisma.student.findMany({
        where: { studentNumber: { in: deduped.map((d) => d.data.studentNumber) } },
        select: { studentNumber: true },
      });
      const existingSet = new Set(existing.map((e) => e.studentNumber));
      toCreate = [];
      for (const d of deduped) {
        if (existingSet.has(d.data.studentNumber)) {
          skipped.push({
            row: d.rowNumber,
            studentNumber: d.data.studentNumber,
            reason: 'duplicate',
          });
        } else {
          toCreate.push(d);
        }
      }
    }

    // Stage 4: bulk insert. The DB unique constraint on studentNumber is the final guard against
    // a concurrent import inserting between our pre-query and createMany; createMany skipDuplicates
    // covers that race so we never throw on it.
    let created = 0;
    if (toCreate.length > 0) {
      const result = await prisma.student.createMany({
        data: toCreate.map((d) => d.data),
        skipDuplicates: true,
      });
      created = result.count;

      // skipDuplicates is the final guard against a concurrent import inserting the same
      // studentNumber between our pre-query and createMany. If it kicks in we log it; the user
      // can re-import and the missed rows will surface as duplicates the normal way.
      if (created < toCreate.length) {
        request.log.warn(
          { expected: toCreate.length, actual: created },
          'bulk import: createMany skipDuplicates absorbed concurrent inserts',
        );
      }
    }

    request.log.info(
      {
        userId: request.user?.id,
        created,
        skipped: skipped.length,
        failed: failed.length,
      },
      'student bulk import complete',
    );

    const result: BulkImportResult = { created, skipped, failed };
    return reply.status(200).send(result);
  });
}
