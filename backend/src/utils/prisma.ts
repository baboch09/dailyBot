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

// Для Supabase pooler: оптимизируем connection string для serverless
// В Session mode ограничено количество подключений, поэтому используем Transaction mode или прямой порт
try {
  const dbUrl = new URL(databaseUrl)
  
  // Если используется pooler порт (6543) в Session mode, переключаемся на Transaction mode или прямой порт
  // Transaction mode поддерживает больше подключений для параллельных запросов
  if (dbUrl.port === '6543') {
    // Переключаемся на Transaction mode pooler (порт 6543, но в URL меняем на транзакционный режим)
    // Или используем прямой порт 5432 для большей надежности
    // Для Supabase: используем POSTGRES_PRISMA_URL для транзакционного pooler или прямой порт
    const isSupabase = dbUrl.hostname.includes('supabase') || dbUrl.hostname.includes('pooler')
    
    if (isSupabase) {
      // Используем прямой порт для избежания лимитов pooler
      dbUrl.port = '5432'
      // Убираем параметры pooler, так как используем прямой порт
      dbUrl.searchParams.delete('pgbouncer')
    } else {
      // Для других pooler'ов переключаемся на прямой порт
      dbUrl.port = '5432'
    }
  }
  
  // Добавляем параметры для оптимизации подключений
  if (!dbUrl.searchParams.has('connect_timeout')) {
    dbUrl.searchParams.set('connect_timeout', '10')
  }
  
  // Ограничиваем количество подключений на один Prisma Client экземпляр
  if (!dbUrl.searchParams.has('connection_limit')) {
    dbUrl.searchParams.set('connection_limit', '5')
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
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Ограничиваем connection pool для serverless
  datasources: {
    db: {
      url: databaseUrl
    }
  }
})

// Глобальный singleton для переиспользования в serverless функциях
// В Vercel каждая функция может иметь свой экземпляр, но мы стараемся переиспользовать
if (typeof globalThis !== 'undefined') {
  (globalThis as any).__prisma = prisma
}

export default prisma
