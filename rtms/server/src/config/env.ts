import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rtms',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  PORT: parseInt(process.env.PORT || '3001', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

if (env.NODE_ENV === 'production') {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET === 'rtms-thesis-jwt-secret-bu-polangui-2026' ||
    process.env.JWT_SECRET === 'dev-secret-change-me'
  ) {
    throw new Error('JWT_SECRET must be set to a strong secret (32+ chars) in production');
  }
}
