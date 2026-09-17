import { FastifyInstance } from 'fastify';
import { login } from '../services/auth.service.js';
import { loginSchema } from '@rtams/shared';
import { prisma } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { verifyToken } from '../utils/jwt.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }

    try {
      const result = await login(parsed.data.username, parsed.data.password);
      return result;
    } catch (error: any) {
      return reply.status(401).send({ error: error.message });
    }
  });

  app.post('/api/auth/logout', async (request) => {
    const header = request.headers.authorization;

    if (header?.startsWith('Bearer ')) {
      try {
        const user = verifyToken(header.slice(7));

        await prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: null },
        });
      } catch {
        // Expired or invalid token: nothing to clear.
      }
    }

    return { message: 'Logged out' };
  });
}

/*
 * Registered outside the rate-limited auth routes: every open staff
 * screen calls this once a minute, often from one shared office IP.
 */
export async function activityRoutes(app: FastifyInstance) {
  /*
   * Marks the user as active. The tablet sign page is only
   * available while a staff member has sent a recent heartbeat.
   */
  app.post(
    '/api/auth/heartbeat',
    { preHandler: authenticate },
    async (request) => {
      await prisma.user.update({
        where: { id: request.user.id },
        data: { lastActiveAt: new Date() },
      });

      return { ok: true };
    }
  );
}
