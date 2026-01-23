import { Request, Response, NextFunction } from 'express'
import prisma from '../utils/prisma'

// Константы для лимитов
export const FREE_HABITS_LIMIT = 3

/**
 * Проверяет, активна ли подписка пользователя
 */
export function isSubscriptionActive(subscriptionStatus: string | null, subscriptionExpiresAt: Date | null): boolean {
  if (!subscriptionStatus || !subscriptionExpiresAt) {
    return false
  }
  
  const now = new Date()
  return subscriptionStatus === 'active' && subscriptionExpiresAt > now
}

/**
 * Middleware для проверки активной подписки
 * Блокирует доступ к premium функциям если подписка неактивна
 */
export async function checkSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }

    // Используем транзакцию для атомарной проверки и обновления статуса
    const userWithSubscription = await prisma.$transaction(async (tx) => {
      const userData = await tx.user.findUnique({
        where: { id: user.id }
      })

      if (!userData) {
        return null
      }

      const now = new Date()
      const isActive = isSubscriptionActive(
        userData.subscriptionStatus,
        userData.subscriptionExpiresAt
      )

      // Автоматически обновляем статус если подписка истекла
      // Используем updateMany для атомарности (обновляем только если статус все еще 'active')
      if (!isActive && userData.subscriptionStatus === 'active') {
        await tx.user.updateMany({
          where: { 
            id: user.id,
            subscriptionStatus: 'active' // Дополнительная проверка для предотвращения race condition
          },
          data: { subscriptionStatus: 'expired' }
        })
        // Обновляем локальную копию
        userData.subscriptionStatus = 'expired'
      }

      return userData
    })

    if (!userWithSubscription) {
      return res.status(404).json({ error: 'User not found' })
    }

    const now = new Date()
    const isActive = isSubscriptionActive(
      userWithSubscription.subscriptionStatus,
      userWithSubscription.subscriptionExpiresAt
    )

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
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }

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
    const isPremium = isSubscriptionActive(
      userWithSubscription.subscriptionStatus,
      userWithSubscription.subscriptionExpiresAt
    )

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