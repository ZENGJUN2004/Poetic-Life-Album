import { PrismaClient } from '@prisma/client';

// 运行时 DATABASE_URL fallback
// - Vercel Postgres 注入 POSTGRES_PRISMA_URL
// - Neon 等外部服务直接注入 DATABASE_URL
// schema datasource 用 env("DATABASE_URL")，这里在 new 之前补齐
if (!process.env.DATABASE_URL) {
  const fallback = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL;
  if (fallback) {
    process.env.DATABASE_URL = fallback;
  }
}

// Neon 建议：迁移用非池化连接 directUrl。若用户只给了 DATABASE_URL，直接复用
// （Neon 单串也能跑 db push，只是大流量下池化更优）
if (!process.env.DATABASE_URL_UNPOOLED && process.env.DATABASE_URL) {
  process.env.DATABASE_URL_UNPOOLED = process.env.DATABASE_URL;
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
