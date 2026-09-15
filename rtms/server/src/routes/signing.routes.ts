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

      const transaction = await prisma.transaction.findUnique({
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
       * Clean up expired pending sessions first.
       */
      const existingSessions = await prisma.signingSession.findMany({
        where: {
          status: {
            in: ['pending', 'signed'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

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
       * Only one tablet signing session can be active at a time.
       */
      const activeSession = existingSessions.find(
        (session) =>
          session.status === 'signed' ||
          (session.status === 'pending' &&
            !isExpired(session.createdAt))
      );

      if (activeSession) {
        return reply.status(409).send({
          error:
            'The tablet is currently in use. Please finish or cancel the current signing session first.',
        });
      }

      const token = crypto.randomBytes(32).toString('hex');

      const session = await prisma.signingSession.create({
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
   * Staff computer polls this endpoint to see the signing status
   * and the live signature coming from the tablet.
   */
  app.get(
    '/api/signing/sessions/:id',
    { preHandler: [authenticate, requireStaff] },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const session = await prisma.signingSession.findUnique({
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
          session.status === 'signed'
            ? session.liveSignature
            : null,
      };
    }
  );

  /*
   * Cancel the current signing session.
   */
  app.delete(
    '/api/signing/sessions/:id',
    { preHandler: [authenticate, requireStaff] },
    async (request, reply) => {
      const { id } = request.params as {
        id: string;
      };

      const session = await prisma.signingSession.findUnique({
        where: { id },
      });

      if (!session) {
        return reply.status(404).send({
          error: 'Signing session not found',
        });
      }

      if (session.status === 'pending') {
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
   * Tablet checks for the current signing session.
   *
   * This endpoint is public because the tablet does not log in
   * to the staff/admin system.
   */
  app.get(
    '/api/signing/tablet/current',
    async (_request, reply) => {
      const session = await prisma.signingSession.findFirst({
        where: {
          status: 'pending',
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

      if (isExpired(session.createdAt)) {
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

      const transaction = await prisma.transaction.findUnique({
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
        },
      });
    }
  );

  /*
   * Receive live signature progress from the tablet.
   *
   * IMPORTANT:
   * An empty signature is allowed here.
   *
   * When the claimant taps "Clear Signature", the tablet sends
   * an empty string. Saving that empty string clears the live
   * preview on the staff computer.
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

      const session = await prisma.signingSession.findUnique({
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
          error: 'Signing session is no longer active',
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
       * Save the current live drawing.
       *
       * This can be an empty string when the claimant clears
       * the signature pad.
       */
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
   * Final signature submission from the tablet.
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

      /*
       * Unlike /progress, the final signature cannot be empty.
       */
      if (!signature) {
        return reply.status(400).send({
          error: 'Signature is required',
        });
      }

      const session = await prisma.signingSession.findUnique({
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
          error: 'Signing session is no longer active',
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
       * Store the final signature on the transaction.
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
       * Mark the signing session as completed.
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
}