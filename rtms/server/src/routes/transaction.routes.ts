import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roles.js';
import { createTransactionSchema, releaseTransactionSchema } from '@rtms/shared';
import { prisma } from '../config/db.js';
import { toApiTransaction } from '../utils/doc-mapper.js';
import {
  createTransaction,
  signTransaction,
  releaseTransaction,
  getTransactions,
} from '../services/transaction.service.js';

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
      page: query.page ? parseInt(query.page) : undefined,
      limit: query.limit ? parseInt(query.limit) : undefined,
    });
  });

  app.get('/api/transactions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction) return reply.status(404).send({ error: 'Not found' });
    return toApiTransaction(transaction);
  });

  app.post('/api/transactions', async (request, reply) => {
    const parsed = createTransactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
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

  app.patch('/api/transactions/:id/sign', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const transaction = await signTransaction(id, request.user.id, request.user.name);
      return transaction;
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  app.patch('/api/transactions/:id/release', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = releaseTransactionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
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
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}
