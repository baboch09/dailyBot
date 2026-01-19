// Vercel Serverless Function - точка входа для backend API
import type { VercelRequest, VercelResponse } from '@vercel/node'

// Создаём Express app динамически
let expressApp: any = null

async function getExpressApp() {
  if (!expressApp) {
    // Динамический импорт для правильной работы на Vercel
    const module = await import('../backend/src/index')
    expressApp = module.default
  }
  return expressApp
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await getExpressApp()
    
    // Express app возвращает функцию или приложение
    if (typeof app === 'function') {
      return app(req, res)
    }
    
    // Если это Express приложение, используем его handle метод
    if (app && typeof app === 'object' && typeof app.handle === 'function') {
      return app.handle(req, res)
    }
    
    res.status(500).json({ error: 'Failed to load Express app' })
  } catch (error: any) {
    console.error('API Error:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
}
