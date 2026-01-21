import { Request, Response, NextFunction } from 'express'
import prisma from '../utils/prisma'

/**
 * Middleware для проверки активной подписки
 * Блокирует доступ к premium функциям если подписка неактивна
 */
export async function checkSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user

    const userWithSubscription = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!userWithSubscription) {
      return res.status(404).json({ error: 'User not found' })
    }

    const now = new Date()
    const isActive = 
      userWithSubscription.subscriptionStatus === 'active' &&
      userWithSubscription.subscriptionExpiresAt &&
      userWithSubscription.subscriptionExpiresAt > now

    // Автоматически обновляем статус если подписка истекла
    if (!isActive && userWithSubscription.subscriptionStatus === 'active') {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'expired' }
      })
    }

    if (!isActive) {
      return res.status(403).json({
        error: 'Premium subscription required',
        message: 'Для использования этой функции нужна активная подписка Premium',
        subscriptionStatus: userWithSubscription.subscriptionStatus || 'free'
      })
    }

    next()
  } catch (error) {
    console.error('Error checking subscription:', error)
    res.status(500).json({ error: 'Failed to check subscription' })
  }
}

/**
 * Middleware для проверки лимитов free подписки
 * Например: ограничение количества привычек
 */
export async function checkFreeLimits(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user

    const userWithSubscription = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        habits: true
      }
    })

    if (!userWithSubscription) {
      return res.status(404).json({ error: 'User not found' })
    }

    const now = new Date()
    const isPremium = 
      userWithSubscription.subscriptionStatus === 'active' &&
      userWithSubscription.subscriptionExpiresAt &&
      userWithSubscription.subscriptionExpiresAt > now

    // Для free пользователей: максимум 3 привычки
    const FREE_HABITS_LIMIT = 3

    if (!isPremium && userWithSubscription.habits.length >= FREE_HABITS_LIMIT) {
      return res.status(403).json({
        error: 'Free plan limit reached',
        message: `На бесплатном тарифе можно создать максимум ${FREE_HABITS_LIMIT} привычки`,
        limit: FREE_HABITS_LIMIT,
        current: userWithSubscription.habits.length,
        upgradeRequired: true
      })
    }

    next()
  } catch (error) {
    console.error('Error checking free limits:', error)
    res.status(500).json({ error: 'Failed to check limits' })
  }
}