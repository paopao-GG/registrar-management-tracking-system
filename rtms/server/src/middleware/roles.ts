import { FastifyRequest, FastifyReply } from 'fastify';

export function requireRole(role: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.user?.role !== role) {
      return reply.status(403).send({ error: 'Insufficient permissions' });
    }
  };
}

export const requireAdmin = requireRole('admin');
