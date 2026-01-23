import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import habitsRoutes from './routes/habits.routes'
import subscriptionRoutes from './routes/subscription.routes'
import paymentsRoutes from './routes/payments.routes'

// Загружаем переменные окружения
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
// CORS настройки: в продакшене лучше указать конкретные домены
const corsOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  // Локальная разработка
  'http://localhost:3000',
  // Vercel
  /\.vercel\.app$/,
  /\.vercel\.com$/
]

// В продакшене добавляем конкретные домены из переменных окружения
if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS) {
  const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  corsOrigins.push(...allowedOrigins)
} else if (process.env.NODE_ENV === 'production') {
  // Если не указаны конкретные домены, разрешаем все (небезопасно, но для гибкости)
  console.warn('⚠️ ALLOWED_ORIGINS not set in production - allowing all origins')
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
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  }
  
  console.error('Error details:', errorDetails)
  
  // В продакшене можно отправлять в систему мониторинга (Sentry и т.д.)
  // if (process.env.NODE_ENV === 'production') {
  //   // Sentry.captureException(err)
  // }
  
  res.status(err.status || 500).json({ 
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
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
