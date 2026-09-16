import { FastifyInstance } from 'fastify';
import { prisma } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import {
  createStudentSchema,
  bulkImportSchema,
  formatStudentName,
  normalizeCourse,
  type BulkImportResult,
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

  /*
   * Get current active students only.
   */
  app.get('/api/students', async (request) => {
    const { q } = request.query as { q?: string };
    const term = q?.trim();

    const where = {
      active: true,
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
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return students.map(toApiStudent);
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
          course,
          yearLevel: parsed.data.yearLevel,
          active: true,
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
       * Get all current students so we can determine:
       * - existing students
       * - students that disappeared from the latest directory
       */
      const existingStudents =
        await prisma.student.findMany({
          select: {
            id: true,
            studentNumber: true,
            active: true,
          },
        });

      const existingByNumber =
        new Map(
          existingStudents.map(
            (student) => [
              student.studentNumber,
              student,
            ]
          )
        );

      const uploadedNumbers =
        new Set(
          deduped.map(
            (student) =>
              student.data.studentNumber
          )
        );

      let created = 0;
      let updated = 0;
      let reactivated = 0;
      let deactivated = 0;

      /*
       * Stage 3:
       * Apply the complete directory update
       * inside one database transaction.
       */
      await prisma.$transaction(
        async (tx) => {
          /*
           * First mark existing students inactive.
           *
           * We do NOT delete them.
           */
          const deactivateResult =
            await tx.student.updateMany({
              where: {
                active: true,
                studentNumber: {
                  notIn:
                    Array.from(
                      uploadedNumbers
                    ),
                },
              },
              data: {
                active: false,
              },
            });

          deactivated =
            deactivateResult.count;

          /*
           * Then update existing students
           * and create new students.
           */
          for (const item of deduped) {
            const existing =
              existingByNumber.get(
                item.data.studentNumber
              );

            if (existing) {
              await tx.student.update({
                where: {
                  id: existing.id,
                },
                data: {
                  lastName:
                    item.data.lastName,
                  firstName:
                    item.data.firstName,
                  middleName:
                    item.data.middleName,
                  email:
                    item.data.email,
                  course:
                    item.data.course,
                  yearLevel:
                    item.data.yearLevel,
                  active: true,
                },
              });

              if (existing.active) {
                updated++;
              } else {
                reactivated++;
              }
            } else {
              await tx.student.create({
                data: {
                  studentNumber:
                    item.data.studentNumber,
                  lastName:
                    item.data.lastName,
                  firstName:
                    item.data.firstName,
                  middleName:
                    item.data.middleName,
                  email:
                    item.data.email,
                  course:
                    item.data.course,
                  yearLevel:
                    item.data.yearLevel,
                  active: true,
                },
              });

              created++;
            }
          }
        }
      );

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