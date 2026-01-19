import { Request, Response, NextFunction } from 'express'
import prisma from '../utils/prisma'

/**
 * Middleware для аутентификации пользователя по telegram_id
 * Извлекает telegram_id из заголовка (отправляется frontend через initData)
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramId = req.headers['x-telegram-id'] as string

    if (!telegramId) {
      console.error('Missing x-telegram-id header in request')
      return res.status(401).json({ 
        error: 'Telegram ID is required. Make sure you opened the app through Telegram.',
        details: 'The x-telegram-id header is missing. This usually means the app was not opened through Telegram Mini App.'
      })
    }

    // Валидация: telegram_id должен быть числом
    if (isNaN(Number(telegramId)) && !/^\d+$/.test(telegramId.trim())) {
      console.error('Invalid telegram_id format:', telegramId)
      return res.status(401).json({ 
        error: 'Invalid telegram ID format',
        details: `Received: ${telegramId}`
      })
    }

    let telegramIdNum: bigint
    try {
      telegramIdNum = BigInt(telegramId.trim())
    } catch (error) {
      console.error('Error converting telegram_id to BigInt:', telegramId, error)
      return res.status(401).json({ 
        error: 'Invalid telegram ID',
        details: `Could not parse: ${telegramId}`
      })
    }

    // Создаём или получаем пользователя
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramIdNum }
    })

    if (!user) {
      user = await prisma.user.create({
        data: { telegramId: telegramIdNum }
      })
      console.log('Created new user with telegram_id:', telegramIdNum.toString())
    }

    // Добавляем пользователя в request для использования в контроллерах
    ;(req as any).user = user

    next()
  } catch (error: any) {
    console.error('Authentication error:', error)
    res.status(401).json({ 
      error: 'Invalid telegram ID',
      details: error.message || 'An error occurred during authentication'
    })
  }
}
