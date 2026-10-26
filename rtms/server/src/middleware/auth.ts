import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { touchActivity } from '../services/auth.service.js';
import { prisma } from '../config/db.js';

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

  /*
   * One device per account: a token only works while its session is
   * the account's current one. Logging out, an admin signing the
   * account out, or another device taking over after this one went
   * idle all end it.
   */
  const current = await prisma.user.findUnique({
    where: { id: request.user.id },
    select: { sessionId: true },
  });

  if (!request.user.sid || current?.sessionId !== request.user.sid) {
    return reply.status(401).send({
      error: 'signed_out',
      message: 'This session has ended. Please log in again.',
    });
  }

  // Keeps the sign device available while this user works.
  touchActivity(request.user.id);
}
