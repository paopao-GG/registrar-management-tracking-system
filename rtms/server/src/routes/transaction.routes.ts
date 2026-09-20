import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin, requireStaff } from '../middleware/roles.js';
import {
  bulkIdsSchema,
  bulkReleaseSchema,
  createTransactionSchema,
  releaseTransactionSchema,
} from '@rtams/shared';
import { prisma } from '../config/db.js';
import { toApiTransaction } from '../utils/doc-mapper.js';
import {
  createTransaction,
  startProcessing,
  signTransaction,
  releaseTransaction,
  getTransactions,
  bulkStartProcessing,
  bulkSign,
  bulkRelease,
  TransitionError,
} from '../services/transaction.service.js';

/*
 * Status changes: show our own messages (e.g. wrong status),
 * but keep raw database errors out of the user's toast.
 */
function sendTransitionError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: unknown
) {
  if (error instanceof TransitionError) {
    return reply.status(400).send({ error: error.message });
  }

  request.log.error(error, 'transaction status update failed');

  return reply.status(500).send({
    error: 'Could not update the requests. Refresh and try again.',
  });
}

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate);

  app.get('/api/transactions', async (request) => {
    const query = request.query as any;

    return getTransactions({
      status: query.status,
      preparedBy: query.preparedBy,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
      course: query.course,
      // Year level 0 is alumni and -1 is not enrolled, so parse instead of checking truthiness.
      yearLevel:
        query.yearLevel !== undefined && query.yearLevel !== ''
          ? parseInt(query.yearLevel)
          : undefined,
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
      includeCounts: query.includeCounts === '1',
    });
  });

  app.get('/api/transactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return reply.status(404).send({ error: 'Not found' });
    }

    return toApiTransaction(transaction);
  });

  app.post('/api/transactions', async (request, reply) => {
    const parsed = createTransactionSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: parsed.error.issues[0].message });
    }

    try {
      const transaction = await createTransaction({
        ...parsed.data,
        userId: request.user.id,
        userName: request.user.name,
      });

      return reply.status(201).send(transaction);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // Start Processing - Staff
  app.patch(
    '/api/transactions/:id/start',
    {
      preHandler: requireStaff,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        return await startProcessing(
          id,
          request.user.id,
          request.user.name
        );
      } catch (error) {
        return sendTransitionError(request, reply, error);
      }
    }
  );

  // Sign - Admin only
  app.patch(
    '/api/transactions/:id/sign',
    {
      preHandler: requireAdmin,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const transaction = await signTransaction(
          id,
          request.user.id,
          request.user.name
        );

        return transaction;
      } catch (error) {
        return sendTransitionError(request, reply, error);
      }
    }
  );

  // Release - Staff
  app.patch(
    '/api/transactions/:id/release',
    {
      preHandler: requireStaff,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const parsed = releaseTransactionSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: parsed.error.issues[0].message });
      }

      try {
        const transaction = await releaseTransaction(
          id,
          parsed.data.releasedTo,
          parsed.data.signature,
          request.user.id,
          request.user.name
        );

        return transaction;
      } catch (error) {
        return sendTransitionError(request, reply, error);
      }
    }
  );

  // Bulk Start Processing - Staff
  app.post(
    '/api/transactions/bulk/start',
    { preHandler: requireStaff },
    async (request, reply) => {
      const parsed = bulkIdsSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }

      try {
        const transactions = await bulkStartProcessing(parsed.data.ids, request.user);
        return { transactions };
      } catch (error) {
        return sendTransitionError(request, reply, error);
      }
    }
  );

  // Bulk Sign - Admin only
  app.post(
    '/api/transactions/bulk/sign',
    { preHandler: requireAdmin },
    async (request, reply) => {
      const parsed = bulkIdsSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }

      try {
        const transactions = await bulkSign(parsed.data.ids, request.user);
        return { transactions };
      } catch (error) {
        return sendTransitionError(request, reply, error);
      }
    }
  );

  // Bulk Release to one claimant with one signature - Staff
  app.post(
    '/api/transactions/bulk/release',
    { preHandler: requireStaff },
    async (request, reply) => {
      const parsed = bulkReleaseSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }

      try {
        const transactions = await bulkRelease(
          parsed.data.ids,
          parsed.data.releasedTo,
          parsed.data.signature,
          request.user,
          parsed.data.sessionId
        );
        return { transactions };
      } catch (error) {
        return sendTransitionError(request, reply, error);
      }
    }
  );
}
