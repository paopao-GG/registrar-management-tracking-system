import { FastifyInstance } from 'fastify';
import { clearActivity, login, LoginError, SessionInUseError } from '../services/auth.service.js';
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
      if (error instanceof SessionInUseError) {
        return reply.status(409).send({ error: error.message });
      }

      if (error instanceof LoginError) {
        return reply.status(401).send({ error: error.message });
      }

      // Anything else (e.g. the database) stays in the server log.
      request.log.error(error, 'Login failed');
      return reply
        .status(500)
        .send({ error: 'Unable to log in right now. Please try again.' });
    }
  });

  app.post('/api/auth/logout', async (request) => {
    const header = request.headers.authorization;

    if (header?.startsWith('Bearer ')) {
      try {
        const user = verifyToken(header.slice(7));
        await clearActivity(user.id, user.sid);
      } catch {
        // Expired or invalid token: nothing to clear.
      }
    }

    return { message: 'Logged out' };
  });
}
