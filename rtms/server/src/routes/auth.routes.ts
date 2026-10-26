import { FastifyInstance } from 'fastify';
import { clearActivity, login } from '../services/auth.service.js';
import { verifyToken } from '../utils/jwt.js';
import { loginSchema } from '@rtams/shared';

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
        await clearActivity(user.id);
      } catch {
        // Expired or invalid token: nothing to clear.
      }
    }

    return { message: 'Logged out' };
  });
}
