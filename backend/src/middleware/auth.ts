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
      return res.status(401).json({ error: 'Telegram ID is required' })
    }

    const telegramIdNum = BigInt(telegramId)

    // Создаём или получаем пользователя
    let user = await prisma.user.findUnique({
      where: { telegramId: telegramIdNum }
    })

    if (!user) {
      user = await prisma.user.create({
        data: { telegramId: telegramIdNum }
      })
    }

    // Добавляем пользователя в request для использования в контроллерах
    ;(req as any).user = user

    next()
  } catch (error) {
    console.error('Authentication error:', error)
    res.status(401).json({ error: 'Invalid telegram ID' })
  }
}
