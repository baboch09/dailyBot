import { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import prisma from '../utils/prisma'

/**
 * Middleware для аутентификации пользователя по telegram_id
 * Извлекает telegram_id из заголовка (отправляется frontend через initData)
 */
export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramId = req.headers['x-telegram-id'] as string
    const telegramName = req.headers['x-telegram-username'] as string | undefined

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
        data: { 
          telegramId: telegramIdNum,
          telegramName: telegramName || null
        }
      })
      console.log('Created new user with telegram_id:', telegramIdNum.toString(), 'username:', telegramName || 'none')
    } else if (telegramName && user.telegramName !== telegramName) {
      // Обновляем username если он изменился
      user = await prisma.user.update({
        where: { id: user.id },
        data: { telegramName: telegramName }
      })
      console.log('Updated username for user:', telegramIdNum.toString(), 'new username:', telegramName)
    }

    // Добавляем пользователя в request для использования в контроллерах
    req.user = user

    next()
  } catch (error: any) {
    console.error('Authentication error:', error)
    // Если упали на запросе к БД/инициализации Prisma — это не ошибка telegram_id
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientRustPanicError
    ) {
      return res.status(500).json({
        error: 'Database error',
        details: error.message || 'Database request failed'
      })
    }

    res.status(401).json({
      error: 'Invalid telegram ID',
      details: error.message || 'An error occurred during authentication'
    })
  }
}
