import { FastifyInstance } from 'fastify';
import { login } from '../services/auth.service.js';
import { loginSchema } from '@rtms/shared';

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

  app.post('/api/auth/logout', async () => {
    return { message: 'Logged out' };
  });
}
