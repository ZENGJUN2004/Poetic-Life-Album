import { PrismaClient } from '@prisma/client';

// 运行时 DATABASE_URL fallback
// Vercel Postgres 集成注入 POSTGRES_PRISMA_URL，但 schema 里用的是 env("DATABASE_URL")
// 在 new PrismaClient() 前补齐，让 serverless function 也能连上数据库
if (!process.env.DATABASE_URL) {
  const fallback = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  if (fallback) {
    process.env.DATABASE_URL = fallback;
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
