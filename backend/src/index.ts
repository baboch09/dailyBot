import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

// Импортируем config ПОСЛЕ загрузки .env для валидации переменных окружения
import { config } from './config'
import habitsRoutes from './routes/habits.routes'
import subscriptionRoutes from './routes/subscription.routes'
import paymentsRoutes from './routes/payments.routes'

const app = express()
const PORT = config.port

// Middleware
// CORS настройки
const corsOrigins = [
  config.frontendUrl,
  'http://localhost:3000',
  /\.vercel\.app$/,
  /\.vercel\.com$/
]

// В продакшене добавляем конкретные домены из переменных окружения
if (config.allowedOrigins && config.allowedOrigins.length > 0) {
  corsOrigins.push(...config.allowedOrigins)
} else if (config.nodeEnv === 'production') {
  console.warn('⚠️ ALLOWED_ORIGINS not set in production - consider setting it for security')
}

app.use(cors({
  origin: corsOrigins.filter(Boolean),
  credentials: true
}))
app.use(express.json())

// Routes
// Health check (для Vercel используется отдельный endpoint api/health.ts)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes (на Vercel они будут доступны через /api/...)
app.use('/api/habits', habitsRoutes)
app.use('/api/subscription', subscriptionRoutes)
app.use('/api/payments', paymentsRoutes)

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  
  // Структурированное логирование ошибок
  const errorDetails = {
    message: err.message,
    stack: config.nodeEnv === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  }
  
  console.error('Error details:', errorDetails)
  
  // В продакшене можно отправлять в систему мониторинга (Sentry и т.д.)
  // if (config.nodeEnv === 'production') {
  //   // Sentry.captureException(err)
  // }
  
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    ...(config.nodeEnv === 'development' && { details: err.message })
  })
})

// Запуск сервера (только для локальной разработки)
// На Vercel сервер не запускается, используется serverless functions
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`)
  })
}

// Экспортируем app для использования в serverless functions (Vercel)
export default app
