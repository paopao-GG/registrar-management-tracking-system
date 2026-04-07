import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, TokenPayload } from '../utils/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: TokenPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'No token provided' });
  }

  try {
    const token = header.slice(7);
    request.user = verifyToken(token);
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
