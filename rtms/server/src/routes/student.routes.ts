import { FastifyInstance } from 'fastify';
import { prisma } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { createStudentSchema } from '@rtms/shared';

export async function studentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/api/students', async (request) => {
    const { q } = request.query as { q?: string };
    const where = q ? { name: { contains: q, mode: 'insensitive' as const } } : {};
    const students = await prisma.student.findMany({
      where,
      take: 10,
      orderBy: { name: 'asc' },
    });
    return students.map((s: any) => ({ ...s, _id: s.id }));
  });

  app.post('/api/students', async (request, reply) => {
    const parsed = createStudentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }
    const student = await prisma.student.create({ data: parsed.data });
    return reply.status(201).send({ ...student, _id: student.id });
  });
}
