import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { studentRoutes } from './routes/student.routes.js';
import { transactionRoutes } from './routes/transaction.routes.js';
import { reportRoutes } from './routes/report.routes.js';
import { userRoutes } from './routes/user.routes.js';
import { auditRoutes } from './routes/audit.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true, trustProxy: true });

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

  // Rate limiting uses in-memory state — skip on Vercel (serverless)
  if (!process.env.VERCEL) {
    await app.register(async function publicRoutes(instance) {
      await instance.register(rateLimit, {
        max: 10,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip,
      });
      await instance.register(authRoutes);
    });
  } else {
    await app.register(authRoutes);
  }

  await app.register(studentRoutes);
  await app.register(transactionRoutes);
  await app.register(reportRoutes);
  await app.register(userRoutes);
  await app.register(auditRoutes);

  return app;
}
