import { prisma } from './config/db.js';
import { env } from './config/env.js';
import { buildApp } from './app.js';

async function start() {
  const app = await buildApp();

  await prisma.$connect();
  console.log('Connected to PostgreSQL');

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  console.log(`Server running on http://localhost:${env.PORT}`);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
