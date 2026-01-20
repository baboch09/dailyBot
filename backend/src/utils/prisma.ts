import { PrismaClient } from '@prisma/client'

// Singleton instance для Prisma Client
// На Vercel Postgres часто доступен только POSTGRES_URL / POSTGRES_PRISMA_URL.
// Prisma schema ожидает DATABASE_URL, поэтому делаем маппинг до инициализации клиента.
let databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_URL_NON_POOLING

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set')
}

// Для Supabase pooler: переключаемся на прямой порт и добавляем параметры
// Это решает проблему "prepared statement already exists" с connection pooling
try {
  const dbUrl = new URL(databaseUrl)
  
  // Если используется pooler порт (6543), переключаемся на прямой (5432)
  if (dbUrl.port === '6543') {
    dbUrl.port = '5432'
  }
  
  // Добавляем параметр для работы с connection pooling
  // ?pgbouncer=true указывает Prisma, что используется connection pooler
  if (!dbUrl.searchParams.has('pgbouncer')) {
    dbUrl.searchParams.set('pgbouncer', 'true')
  }
  
  // Отключаем prepared statements для pooler (они не поддерживаются)
  if (!dbUrl.searchParams.has('connect_timeout')) {
    dbUrl.searchParams.set('connect_timeout', '10')
  }
  
  databaseUrl = dbUrl.toString()
} catch (error) {
  console.warn('Could not parse DATABASE_URL for pooler adjustments:', error)
}

// Обновляем переменную окружения для Prisma
process.env.DATABASE_URL = databaseUrl

// Настройка Prisma Client для serverless окружения (Vercel)
// В serverless окружении лучше использовать прямой порт (5432) вместо pooler (6543)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

export default prisma
