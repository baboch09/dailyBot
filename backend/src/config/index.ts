/**
 * Централизованная конфигурация приложения с валидацией
 * Все environment variables проверяются при старте приложения
 */

interface AppConfig {
  // Server
  port: number
  nodeEnv: 'development' | 'production' | 'test'
  frontendUrl: string
  allowedOrigins?: string[]

  // Database
  databaseUrl: string

  // YooKassa
  yookassa: {
    shopId: string
    secretKey: string
    mode: 'test' | 'production'
    isTestMode: boolean
    apiUrl: string
  }

  // Telegram
  telegram: {
    botToken?: string
    webAppUrl?: string
  }

  // URLs
  webAppUrl: string
}

/**
 * Валидация обязательных переменных окружения
 */
function validateEnv(): void {
  const required = [
    'YUKASSA_SHOP_ID',
    'YUKASSA_SECRET_KEY'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file or environment configuration.`
    )
  }

  // DATABASE_URL - предупреждение, но не критично (для serverless может быть POSTGRES_PRISMA_URL)
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_PRISMA_URL) {
    console.warn('⚠️  WARNING: DATABASE_URL is not set. Database operations may fail.')
  }

  // Валидация формата переменных
  const shopId = process.env.YUKASSA_SHOP_ID!
  const secretKey = process.env.YUKASSA_SECRET_KEY!

  // Проверка, что используются правильные ключи для режима
  const mode = process.env.YUKASSA_MODE || 'test'
  
  if (mode === 'production') {
    // В продакшене не должно быть тестовых ключей
    if (secretKey.startsWith('test_')) {
      throw new Error(
        '❌ SECURITY ERROR: Cannot use test credentials in production mode!\n' +
        'Please set YUKASSA_SECRET_KEY to your live secret key.\n' +
        'You can get it from YooKassa dashboard: Settings → API Keys'
      )
    }
    
    console.log('🔒 Production mode: Using live YooKassa credentials')
  } else {
    // В тестовом режиме должны быть тестовые ключи
    if (!secretKey.startsWith('test_')) {
      console.warn(
        '⚠️  WARNING: Using live credentials in test mode!\n' +
        'Consider using test credentials for development.\n' +
        'You can get test credentials from YooKassa dashboard.'
      )
    }
    
    console.log('🧪 Test mode: Using test YooKassa credentials')
  }
}

/**
 * Загрузка и валидация конфигурации
 */
function loadConfig(): AppConfig {
  // Валидируем переменные окружения
  validateEnv()

  const nodeEnv = (process.env.NODE_ENV || 'development') as AppConfig['nodeEnv']
  
  // Определяем режим YooKassa
  // Приоритет: YUKASSA_MODE > NODE_ENV (production/development)
  const yookassaMode = process.env.YUKASSA_MODE === 'production' 
    ? 'production' 
    : 'test'
  
  const isTestMode = yookassaMode === 'test'

  // YooKassa использует один и тот же API URL для теста и прода
  // Разница только в ключах (test_xxx или live_xxx)
  const yookassaApiUrl = 'https://api.yookassa.ru/v3'

  const config: AppConfig = {
    // Server
    port: parseInt(process.env.PORT || '5001', 10),
    nodeEnv,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()),

    // Database
    databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || '',

    // YooKassa
    yookassa: {
      shopId: process.env.YUKASSA_SHOP_ID!,
      secretKey: process.env.YUKASSA_SECRET_KEY!,
      mode: yookassaMode,
      isTestMode,
      apiUrl: yookassaApiUrl
    },

    // Telegram
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      webAppUrl: process.env.TELEGRAM_WEBAPP_URL || process.env.WEBAPP_URL
    },

    // URLs
    webAppUrl: process.env.WEBAPP_URL || 
               process.env.FRONTEND_URL || 
               process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
               'http://localhost:3000'
  }

  return config
}

// Экспортируем singleton конфигурации
export const config = loadConfig()

// Логируем конфигурацию при старте (без секретов)
console.log('📋 Application configuration loaded:')
console.log(`   Environment: ${config.nodeEnv}`)
console.log(`   YooKassa mode: ${config.yookassa.mode} ${config.yookassa.isTestMode ? '🧪' : '🔒'}`)
console.log(`   Shop ID: ${config.yookassa.shopId}`)
console.log(`   Secret Key: ${config.yookassa.secretKey.substring(0, 10)}...`)
console.log(`   Frontend URL: ${config.frontendUrl}`)
console.log(`   WebApp URL: ${config.webAppUrl}`)
console.log(`   Database: ${config.databaseUrl.split('@')[1] || 'configured'}`)

// Предупреждение для продакшена
if (config.yookassa.mode === 'production') {
  console.log('🚀 PRODUCTION MODE ENABLED - Using live payments!')
  console.log('   Make sure webhook URL is configured in YooKassa dashboard')
  console.log('   Webhook URL should be: https://your-domain.com/api/payments/webhook')
}
