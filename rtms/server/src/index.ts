import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { prisma } from './config/db.js';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { studentRoutes } from './routes/student.routes.js';
import { transactionRoutes } from './routes/transaction.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { auditRoutes } from './routes/audit.routes.js';

const app = Fastify({ logger: true });

async function start() {
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
  });

  // Rate limit only on auth routes (login)
  await app.register(async function publicRoutes(instance) {
    await instance.register(rateLimit, {
      max: 10,
      timeWindow: '1 minute',
      keyGenerator: (req) => req.ip,
    });
    await instance.register(authRoutes);
  });

  // No rate limit on protected routes
  await app.register(studentRoutes);
  await app.register(transactionRoutes);
  await app.register(reportRoutes);
  await app.register(userRoutes);
  await app.register(auditRoutes);

  await prisma.$connect();
  console.log('Connected to PostgreSQL');

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`Server running on http://localhost:${env.PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
