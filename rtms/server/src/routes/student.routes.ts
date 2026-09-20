import { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import {
  COURSE_ALIASES,
  NOT_ENROLLED_YEAR_LEVEL,
  createStudentSchema,
  bulkImportSchema,
  currentYearLevel,
  formatStudentName,
  normalizeCourse,
  type BulkImportResult,
  type BulkImportFailed,
} from '@rtams/shared';

type DirectoryRow = {
  studentNumber: string;
  lastName: string;
  firstName: string;
  middleName: string | null;
  email: string | null;
  sex: string | null;
  contactNumber: string | null;
  course: string;
  yearLevel: number;
};

// Rows per INSERT; 500 rows x 10 values stays far below Postgres's bind-parameter limit.
const UPSERT_CHUNK_SIZE = 500;

/*
 * Create or update a chunk of directory rows in one statement,
 * matching existing students by student number.
 */
function upsertStudents(rows: DirectoryRow[]) {
  const values = rows.map(
    (r) => Prisma.sql`(
      gen_random_uuid()::text, ${r.studentNumber}, ${r.lastName}, ${r.firstName},
      ${r.middleName}, ${r.email}, ${r.sex}, ${r.contactNumber}, ${r.course},
      ${r.yearLevel}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )`
  );

  return prisma.$executeRaw`
    INSERT INTO "Student" (
      "id", "studentNumber", "lastName", "firstName", "middleName", "email",
      "sex", "contactNumber", "course", "yearLevel", "active", "createdAt", "updatedAt"
    )
    VALUES ${Prisma.join(values)}
    ON CONFLICT ("studentNumber") DO UPDATE SET
      "lastName" = EXCLUDED."lastName",
      "firstName" = EXCLUDED."firstName",
      "middleName" = EXCLUDED."middleName",
      "email" = EXCLUDED."email",
      "sex" = EXCLUDED."sex",
      "contactNumber" = EXCLUDED."contactNumber",
      "course" = EXCLUDED."course",
      "yearLevel" = EXCLUDED."yearLevel",
      "active" = true,
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

function toApiStudent(s: any) {
  return {
    _id: s.id,
    studentNumber: s.studentNumber,
    lastName: s.lastName,
    firstName: s.firstName,
    middleName: s.middleName,
    email: s.email,
    sex: s.sex,
    contactNumber: s.contactNumber,
    course: s.course,
    yearLevel: currentYearLevel(s),
    isAlumni: s.isAlumni,
    name: formatStudentName(s),
    createdAt: s.createdAt,
  };
}

export async function studentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  /*
   * Search students for the request form.
   *
   * Students missing from the current roster are included
   * as Not Enrolled, after enrolled students and alumni.
   */
  app.get('/api/students', async (request) => {
    const { q } = request.query as { q?: string };
    const term = q?.trim();

    const where = {
      ...(term
        ? {
            OR: [
              {
                lastName: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },
              {
                firstName: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },
              {
                studentNumber: {
                  contains: term,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    const students = await prisma.student.findMany({
      where,
      take: 10,
      orderBy: [
        { active: 'desc' },
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return students.map(toApiStudent);
  });

  /*
   * Student directory — Admin only.
   *
   * Paginated list of active students with a total count,
   * optionally filtered by program alias (e.g. BSIT).
   */
  app.get('/api/students/directory', async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      });
    }

    const query = request.query as {
      q?: string;
      course?: string;
      page?: string;
      limit?: string;
    };

    const term = query.q?.trim();
    const course = query.course
      ? COURSE_ALIASES[query.course]
      : undefined;

    if (query.course && !course) {
      return reply.status(400).send({
        error: `Invalid program '${query.course}'`,
      });
    }

    const page = Math.max(1, parseInt(query.page ?? '1') || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(query.limit ?? '50') || 50)
    );

    const where = {
      active: true,
      // Alumni are request-only records, not enrolled students.
      isAlumni: false,
      ...(course ? { course } : {}),
      ...(term
        ? {
            OR: [
              { lastName: { contains: term, mode: 'insensitive' as const } },
              { firstName: { contains: term, mode: 'insensitive' as const } },
              { studentNumber: { contains: term, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' },
        ],
      }),
      prisma.student.count({ where }),
    ]);

    return {
      students: students.map(toApiStudent),
      total,
      page,
      limit,
    };
  });

  /*
   * Remove student — Admin only.
   *
   * This is still a manual removal feature.
   * It physically deletes only students without transactions.
   *
   * Students with transactions are protected.
   */
  app.delete('/api/students/:id', async (request, reply) => {
    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'Admin access required',
      });
    }

    const { id } = request.params as { id: string };

    try {
      const student = await prisma.student.findUnique({
        where: { id },
        include: {
          transactions: true,
        },
      });

      if (!student) {
        return reply.status(404).send({
          error: 'Student not found',
        });
      }

      if (student.transactions.length > 0) {
        return reply.status(409).send({
          error:
            'Cannot remove a student with existing transactions.',
        });
      }

      await prisma.student.delete({
        where: { id },
      });

      return reply.status(200).send({
        message: 'Student removed successfully',
      });
    } catch (err) {
      request.log.error(
        err,
        'Failed to remove student'
      );

      return reply.status(500).send({
        error: 'Failed to remove student',
      });
    }
  });

  /*
   * Manually create a student.
   */
  app.post('/api/students', async (request, reply) => {
    const parsed = createStudentSchema.safeParse(
      request.body
    );

    if (!parsed.success) {
      return reply.status(400).send({
        error: parsed.error.issues[0].message,
      });
    }

    const course = normalizeCourse(parsed.data.course);

    if (!course) {
      return reply.status(400).send({
        error: `Invalid program '${parsed.data.course}'`,
      });
    }

    /*
     * A not-enrolled student is kept out of the current roster,
     * like a student missing from the latest import.
     */
    const notEnrolled =
      !parsed.data.isAlumni && parsed.data.notEnrolled === true;

    try {
      const student = await prisma.student.create({
        data: {
          studentNumber:
            parsed.data.studentNumber ??
            `MANUAL-${Date.now().toString(36)}`,
          lastName: parsed.data.lastName,
          firstName: parsed.data.firstName,
          middleName:
            parsed.data.middleName ?? null,
          email:
            parsed.data.email ?? null,
          sex: parsed.data.sex ?? null,
          contactNumber:
            parsed.data.contactNumber ?? null,
          course,
          // Year level 0 marks an alumni record.
          yearLevel: parsed.data.isAlumni
            ? 0
            : notEnrolled
              ? NOT_ENROLLED_YEAR_LEVEL
              : parsed.data.yearLevel!,
          isAlumni: parsed.data.isAlumni ?? false,
          active: !notEnrolled,
        },
      });

      return reply
        .status(201)
        .send(toApiStudent(student));
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return reply.status(409).send({
          error: 'Student number already exists',
        });
      }

      throw err;
    }
  });

  /*
   * Update the Student Directory from the latest Registrar file.
   *
   * Rules:
   * - Students in the file are active.
   * - Existing students are updated.
   * - New students are created.
   * - Existing students missing from the file become inactive.
   * - No Student record is physically deleted.
   * - Existing transactions remain untouched.
   */
  app.post(
    '/api/students/bulk',
    // A full Registrar directory is close to 1 MB; Vercel caps bodies at 4.5 MB.
    { preHandler: requireAdmin, bodyLimit: 4 * 1024 * 1024 },
    async (request, reply) => {
      const parsed = bulkImportSchema.safeParse(
        request.body
      );

      if (!parsed.success) {
        const issue = parsed.error.issues[0];

        const rowIdx =
          typeof issue.path[0] === 'number'
            ? issue.path[0]
            : null;

        const field = issue.path
          .slice(1)
          .join('.');

        const prefix =
          rowIdx !== null
            ? `row ${rowIdx + 2}`
            : 'request';

        return reply.status(400).send({
          error: `${prefix}${
            field ? ` (${field})` : ''
          }: ${issue.message}`,
        });
      }

      const failed: BulkImportFailed[] = [];

      type Staged = {
        rowNumber: number;
        data: DirectoryRow;
      };

      /*
       * Stage 1:
       * Normalize and validate each row.
       */
      const staged: Staged[] = [];

      for (
        let i = 0;
        i < parsed.data.length;
        i++
      ) {
        const row = parsed.data[i];
        const rowNumber = i + 2;

        const course = normalizeCourse(
          row.course
        );

        if (!course) {
          failed.push({
            row: rowNumber,
            reason: `invalid program '${row.course}'`,
          });

          continue;
        }

        staged.push({
          rowNumber,
          data: {
            studentNumber: row.studentNumber,
            lastName: row.lastName,
            firstName: row.firstName,
            middleName:
              row.middleName ?? null,
            email:
              row.email ?? null,
            sex: row.sex ?? null,
            contactNumber:
              row.contactNumber ?? null,
            course,
            yearLevel: row.yearLevel,
          },
        });
      }

      /*
       * Stage 2:
       * Deduplicate student numbers inside the uploaded file.
       *
       * Last occurrence wins.
       */
      const seen = new Map<
        string,
        Staged
      >();

      for (const s of staged) {
        const prior = seen.get(
          s.data.studentNumber
        );

        if (prior) {
          failed.push({
            row: prior.rowNumber,
            reason:
              `duplicate student number '${prior.data.studentNumber}' ` +
              `(kept row ${s.rowNumber})`,
          });
        }

        seen.set(
          s.data.studentNumber,
          s
        );
      }

      const deduped =
        Array.from(seen.values());

      /*
       * Nothing valid to process.
       */
      if (deduped.length === 0) {
        return reply.status(200).send({
          created: 0,
          updated: 0,
          reactivated: 0,
          deactivated: 0,
          skipped: [],
          failed,
        });
      }

      /*
       * Classify each row against the current directory
       * for the import summary.
       */
      const existingStudents =
        await prisma.student.findMany({
          select: {
            studentNumber: true,
            active: true,
          },
        });

      const existingByNumber = new Map(
        existingStudents.map((student) => [
          student.studentNumber,
          student,
        ])
      );

      let created = 0;
      let updated = 0;
      let reactivated = 0;

      for (const item of deduped) {
        const existing = existingByNumber.get(
          item.data.studentNumber
        );

        if (!existing) created++;
        else if (existing.active) updated++;
        else reactivated++;
      }

      /*
       * Stage 3:
       * Apply the complete directory update in one batch
       * transaction: deactivate students missing from the
       * file (never delete them), then upsert every row in
       * chunks.
       */
      const upserts = [];

      for (
        let i = 0;
        i < deduped.length;
        i += UPSERT_CHUNK_SIZE
      ) {
        upserts.push(
          upsertStudents(
            deduped
              .slice(i, i + UPSERT_CHUNK_SIZE)
              .map((item) => item.data)
          )
        );
      }

      const [deactivateResult] = await prisma.$transaction([
        prisma.student.updateMany({
          where: {
            active: true,
            // Alumni are added per request, not by the roster.
            isAlumni: false,
            studentNumber: {
              notIn: deduped.map(
                (item) => item.data.studentNumber
              ),
            },
          },
          data: {
            active: false,
          },
        }),
        ...upserts,
      ]);

      const deactivated = deactivateResult.count;

      request.log.info(
        {
          userId: request.user?.id,
          created,
          updated,
          reactivated,
          deactivated,
          failed: failed.length,
        },
        'student directory update complete'
      );

      /*
       * Keep the existing response fields while adding
       * information about the directory update.
       */
      const result: BulkImportResult & {
        updated: number;
        reactivated: number;
        deactivated: number;
      } = {
        created,
        updated,
        reactivated,
        deactivated,
        skipped: [],
        failed,
      };

      return reply
        .status(200)
        .send(result);
    }
  );
}