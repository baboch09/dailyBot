import { PrismaClient } from '@prisma/client'

// Singleton instance для Prisma Client
// На Vercel Postgres часто доступен только POSTGRES_URL / POSTGRES_PRISMA_URL.
// Prisma schema ожидает DATABASE_URL, поэтому делаем маппинг до инициализации клиента.
const fallbackDatabaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING

if (!process.env.DATABASE_URL && fallbackDatabaseUrl) {
  process.env.DATABASE_URL = fallbackDatabaseUrl
}

const prisma = new PrismaClient()

export default prisma
