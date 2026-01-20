import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import habitsRoutes from './routes/habits.routes'

// Загружаем переменные окружения
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    // Локальная разработка
    'http://localhost:3000',
    // Vercel
    /\.vercel\.app$/,
    /\.vercel\.com$/,
    // Любой домен (для гибкости в продакшене)
    ...(process.env.NODE_ENV === 'production' ? [true] : [])
  ].filter(Boolean),
  credentials: true
}))
app.use(express.json())

// Routes
// Health check (для Vercel используется отдельный endpoint api/health.ts)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API routes (на Vercel они будут доступны через /api/habits)
app.use('/api/habits', habitsRoutes)

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(500).json({ error: 'Internal server error' })
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
