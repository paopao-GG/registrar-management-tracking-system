import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { prisma } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { createUserSchema, updateUserSchema } from '@rtms/shared';

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', requireAdmin);

  app.get('/api/users', async () => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, username: true, role: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { name: 'asc' },
    });
    return users.map((u: any) => ({ ...u, _id: u.id }));
  });

  app.post('/api/users', async (request, reply) => {
    const parsed = createUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    const existing = await prisma.user.findUnique({
      where: { username: parsed.data.username.toLowerCase() },
    });
    if (existing) {
      return reply.status(409).send({ error: 'Username already exists' });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username: parsed.data.username.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
        status: 'active',
      },
    });

    const { passwordHash: _, ...userObj } = user;
    return reply.status(201).send({ ...userObj, _id: user.id });
  });

  app.patch('/api/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    try {
      const user = await prisma.user.update({
        where: { id },
        data: parsed.data,
        select: { id: true, name: true, username: true, role: true, status: true, createdAt: true, updatedAt: true },
      });
      return { ...user, _id: user.id };
    } catch {
      return reply.status(404).send({ error: 'User not found' });
    }
  });

  app.patch('/api/users/:id/reset-password', async (request, reply) => {
    const { id } = request.params as { id: string };
    const tempPassword = 'temp' + Math.random().toString(36).slice(2, 8);
    const passwordHash = await hashPassword(tempPassword);

    try {
      await prisma.user.update({ where: { id }, data: { passwordHash } });
      return { message: 'Password reset', temporaryPassword: tempPassword };
    } catch {
      return reply.status(404).send({ error: 'User not found' });
    }
  });
}
