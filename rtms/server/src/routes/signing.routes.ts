import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { requireStaff } from '../middleware/roles.js';

const SESSION_TIMEOUT_MS = 10 * 60 * 1000;

function isExpired(createdAt: Date) {
  return Date.now() - createdAt.getTime() > SESSION_TIMEOUT_MS;
}

export async function signingRoutes(app: FastifyInstance) {
  /*
   * STAFF:
   * Create a tablet signing session.
   */
  app.post(
    '/api/signing/sessions',
    { preHandler: [authenticate, requireStaff] },
    async (request, reply) => {
      const body = request.body as {
        transactionId?: string;
        releasedTo?: string;
      };

      const transactionId = body.transactionId?.trim();
      const releasedTo = body.releasedTo?.trim();

      if (!transactionId) {
        return reply.status(400).send({
          error: 'Transaction ID is required',
        });
      }

      if (!releasedTo) {
        return reply.status(400).send({
          error: 'Claimant name is required',
        });
      }

      const transaction =
        await prisma.transaction.findUnique({
          where: { id: transactionId },
        });

      if (!transaction) {
        return reply.status(404).send({
          error: 'Transaction not found',
        });
      }

      if (transaction.status !== 'Ready for Release') {
        return reply.status(400).send({
          error:
            'Transaction must be Ready for Release before tablet signing.',
        });
      }

      /*
       * Find existing tablet sessions.
       *
       * Both "pending" and "signed" sessions are active.
       *
       * A "signed" session remains active until staff
       * confirms or cancels it.
       */
      const existingSessions =
        await prisma.signingSession.findMany({
          where: {
            status: {
              in: ['pending', 'signed'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      /*
       * Expire old pending sessions.
       */
      for (const session of existingSessions) {
        if (
          session.status === 'pending' &&
          isExpired(session.createdAt)
        ) {
          await prisma.signingSession.update({
            where: { id: session.id },
            data: {
              status: 'expired',
            },
          });
        }
      }

      /*
       * Check again for an active session.
       *
       * A signed session is still active because staff
       * has not confirmed it yet.
       */
      const activeSession = existingSessions.find(
        (session) =>
          session.status === 'signed' ||
          (
            session.status === 'pending' &&
            !isExpired(session.createdAt)
          )
      );

      if (activeSession) {
        return reply.status(409).send({
          error:
            'The tablet is currently in use. Please finish or confirm the current signing session first.',
        });
      }

      const token = crypto
        .randomBytes(32)
        .toString('hex');

      const session =
        await prisma.signingSession.create({
          data: {
            transactionId,
            token,
            releasedTo,
            status: 'pending',
          },
        });

      return reply.status(201).send({
        sessionId: session.id,
        token: session.token,
        transactionId,
        releasedTo,
        studentName: transaction.studentName,
      });
    }
  );

  /*
   * STAFF:
   * Check the current signing session.
   *
   * The staff computer uses this to receive the live
   * signature and detect when the claimant has submitted it.
   */
  app.get(
    '/api/signing/sessions/:id',
    {
      preHandler: [authenticate, requireStaff],
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const session =
        await prisma.signingSession.findUnique({
          where: { id },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      if (
        session.status === 'pending' &&
        isExpired(session.createdAt)
      ) {
        await prisma.signingSession.update({
          where: { id },
          data: {
            status: 'expired',
          },
        });

        return {
          status: 'expired',
          releasedTo: session.releasedTo,
          liveSignature: null,
          signature: null,
        };
      }

      return {
        status: session.status,
        releasedTo: session.releasedTo,
        liveSignature: session.liveSignature,
        signature:
          session.status === 'signed' ||
          session.status === 'confirmed'
            ? session.liveSignature
            : null,
      };
    }
  );

  /*
   * STAFF:
   * Cancel a signing session.
   */
  app.delete(
    '/api/signing/sessions/:id',
    {
      preHandler: [authenticate, requireStaff],
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const session =
        await prisma.signingSession.findUnique({
          where: { id },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      /*
       * A session can only be cancelled before staff
       * confirms it.
       */
      if (
        session.status === 'pending' ||
        session.status === 'signed'
      ) {
        await prisma.signingSession.update({
          where: { id },
          data: {
            status: 'cancelled',
          },
        });
      }

      return {
        message: 'Signing session cancelled',
      };
    }
  );

  /*
   * TABLET:
   * Find the current active signing session.
   *
   * This endpoint is public because the tablet does not
   * log into the staff/admin system.
   *
   * IMPORTANT:
   * Both "pending" and "signed" sessions are returned.
   *
   * This allows the tablet to show:
   *
   * "Signature Required"
   *
   * while pending, and:
   *
   * "Signature Submitted"
   *
   * while waiting for staff confirmation.
   */
  app.get(
    '/api/signing/tablet/current',
    async (_request, reply) => {
      const session =
        await prisma.signingSession.findFirst({
          where: {
            status: {
              in: ['pending', 'signed'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

      if (!session) {
        return reply.send({
          session: null,
        });
      }

      /*
       * Only expire sessions that are still pending.
       *
       * A signed session has already received a signature
       * and should remain available for staff confirmation.
       */
      if (
        session.status === 'pending' &&
        isExpired(session.createdAt)
      ) {
        await prisma.signingSession.update({
          where: { id: session.id },
          data: {
            status: 'expired',
          },
        });

        return reply.send({
          session: null,
        });
      }

      const transaction =
        await prisma.transaction.findUnique({
          where: {
            id: session.transactionId,
          },
        });

      if (!transaction) {
        await prisma.signingSession.update({
          where: { id: session.id },
          data: {
            status: 'cancelled',
          },
        });

        return reply.send({
          session: null,
        });
      }

      return reply.send({
        session: {
          token: session.token,
          releasedTo: session.releasedTo,
          studentName: transaction.studentName,
          status: session.status,
        },
      });
    }
  );

  /*
   * TABLET:
   * Send the current signature drawing to the server.
   */
  app.post(
    '/api/signing/sessions/:token/progress',
    async (request, reply) => {
      const { token } = request.params as {
        token: string;
      };

      const body = request.body as {
        signature?: string;
      };

      const signature =
        typeof body.signature === 'string'
          ? body.signature.trim()
          : '';

      const session =
        await prisma.signingSession.findUnique({
          where: {
            token,
          },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      if (session.status !== 'pending') {
        return reply.status(400).send({
          error:
            'Signing session is no longer active',
        });
      }

      if (isExpired(session.createdAt)) {
        await prisma.signingSession.update({
          where: { id: session.id },
          data: {
            status: 'expired',
          },
        });

        return reply.status(400).send({
          error: 'Signing session has expired',
        });
      }

      await prisma.signingSession.update({
        where: {
          id: session.id,
        },
        data: {
          liveSignature: signature,
        },
      });

      return {
        success: true,
      };
    }
  );

  /*
   * TABLET:
   * Submit the final signature.
   */
  app.post(
    '/api/signing/sessions/:token/sign',
    async (request, reply) => {
      const { token } = request.params as {
        token: string;
      };

      const body = request.body as {
        signature?: string;
      };

      const signature =
        typeof body.signature === 'string'
          ? body.signature.trim()
          : '';

      if (!signature) {
        return reply.status(400).send({
          error: 'Signature is required',
        });
      }

      const session =
        await prisma.signingSession.findUnique({
          where: {
            token,
          },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      if (session.status !== 'pending') {
        return reply.status(400).send({
          error:
            'Signing session is no longer active',
        });
      }

      if (isExpired(session.createdAt)) {
        await prisma.signingSession.update({
          where: { id: session.id },
          data: {
            status: 'expired',
          },
        });

        return reply.status(400).send({
          error: 'Signing session has expired',
        });
      }

      /*
       * Save the final signature to the transaction.
       *
       * The transaction itself is NOT released yet.
       * Staff must still confirm the signature.
       */
      await prisma.transaction.update({
        where: {
          id: session.transactionId,
        },
        data: {
          signature,
        },
      });

      /*
       * Mark the session as signed.
       *
       * It remains active until staff confirms it.
       */
      await prisma.signingSession.update({
        where: {
          id: session.id,
        },
        data: {
          liveSignature: signature,
          status: 'signed',
          completedAt: new Date(),
        },
      });

      return {
        success: true,
        status: 'signed',
      };
    }
  );

  /*
   * STAFF:
   * Confirm the signature after reviewing it.
   *
   * This changes the signing session from "signed"
   * to "confirmed".
   *
   * The actual transaction release is handled separately
   * by the existing transaction release endpoint.
   */
  app.post(
    '/api/signing/sessions/:id/confirm',
    {
      preHandler: [authenticate, requireStaff],
    },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const session =
        await prisma.signingSession.findUnique({
          where: { id },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      if (session.status !== 'signed') {
        return reply.status(400).send({
          error:
            'Signature must be submitted before it can be confirmed.',
        });
      }

      await prisma.signingSession.update({
        where: {
          id: session.id,
        },
        data: {
          status: 'confirmed',
        },
      });

      return {
        success: true,
        status: 'confirmed',
      };
    }
  );

  /*
   * TABLET:
   * Check whether staff has confirmed the signature.
   *
   * This endpoint is public because the tablet does not
   * log into the staff/admin system.
   */
  app.get(
    '/api/signing/tablet/status/:token',
    async (request, reply) => {
      const { token } = request.params as {
        token: string;
      };

      const session =
        await prisma.signingSession.findUnique({
          where: {
            token,
          },
        });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      return {
        status: session.status,
      };
    }
  );
}
