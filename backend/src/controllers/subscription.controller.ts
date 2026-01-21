import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { createPayment, getPayment } from '../utils/yookassa'

const SHOP_ID = process.env.YUKASSA_SHOP_ID!
const SECRET_KEY = process.env.YUKASSA_SECRET_KEY!

// Тарифы подписки
const SUBSCRIPTION_PLANS = {
  month: {
    name: 'Месяц',
    price: 99, // рублей
    durationDays: 30
  },
  year: {
    name: 'Год',
    price: 990, // рублей (экономия)
    durationDays: 365
  }
}

/**
 * Получить статус подписки пользователя
 */
export async function getSubscriptionStatus(req: Request, res: Response) {
  try {
    const user = (req as any).user

    const userWithSubscription = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
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

    const daysRemaining = userWithSubscription.subscriptionExpiresAt && userWithSubscription.subscriptionExpiresAt > now
      ? Math.ceil((userWithSubscription.subscriptionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    res.json({
      subscriptionType: userWithSubscription.subscriptionType || 'free',
      subscriptionStatus: isActive ? 'active' : (userWithSubscription.subscriptionStatus || 'free'),
      subscriptionExpiresAt: userWithSubscription.subscriptionExpiresAt?.toISOString() || null,
      subscriptionStartedAt: userWithSubscription.subscriptionStartedAt?.toISOString() || null,
      daysRemaining: isActive ? daysRemaining : 0,
      recentPayments: userWithSubscription.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Error getting subscription status:', error)
    res.status(500).json({ error: 'Failed to get subscription status' })
  }
}

/**
 * Получить список доступных тарифов
 */
export async function getSubscriptionPlans(req: Request, res: Response) {
  try {
    res.json({
      plans: Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
        id: key,
        name: plan.name,
        price: plan.price,
        durationDays: plan.durationDays
      }))
    })
  } catch (error) {
    console.error('Error getting subscription plans:', error)
    res.status(500).json({ error: 'Failed to get subscription plans' })
  }
}

/**
 * Создать платеж для подписки
 */
export async function createSubscriptionPayment(req: Request, res: Response) {
  try {
    const user = (req as any).user
    const { planId } = req.body

    if (!planId || !SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]) {
      return res.status(400).json({ error: 'Invalid plan ID' })
    }

    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]

    if (!SHOP_ID || !SECRET_KEY) {
      return res.status(500).json({ error: 'YooKassa credentials not configured' })
    }

    const successUrl = process.env.PAYMENT_SUCCESS_URL || `${req.protocol}://${req.get('host')}/payment/success`
    const failUrl = process.env.PAYMENT_FAIL_URL || `${req.protocol}://${req.get('host')}/payment/fail`

    // Создаем платеж в ЮКассе
    const payment = await createPayment(
      SHOP_ID,
      SECRET_KEY,
      plan.price,
      `Подписка "${plan.name}" - Трекер привычек`,
      successUrl,
      {
        userId: user.id,
        planId: planId,
        telegramId: user.telegramId.toString()
      }
    )

    // Сохраняем платеж в БД
    const dbPayment = await prisma.payment.create({
      data: {
        userId: user.id,
        yookassaId: payment.id,
        amount: plan.price,
        currency: 'RUB',
        status: payment.status,
        description: `Подписка "${plan.name}" - Трекер привычек`,
        metadata: JSON.stringify({
          planId,
          planName: plan.name,
          durationDays: plan.durationDays
        })
      }
    })

    res.json({
      paymentId: dbPayment.id,
      yookassaId: payment.id,
      amount: plan.price,
      confirmationUrl: payment.confirmation?.confirmation_url,
      status: payment.status
    })
  } catch (error: any) {
    console.error('Error creating subscription payment:', error)
    res.status(500).json({ 
      error: 'Failed to create payment',
      message: error.message 
    })
  }
}

/**
 * Проверить статус платежа и обновить подписку
 */
export async function checkPaymentStatus(req: Request, res: Response) {
  try {
    const user = (req as any).user
    const { paymentId } = req.params

    const dbPayment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId: user.id
      }
    })

    if (!dbPayment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    if (!dbPayment.yookassaId) {
      return res.status(400).json({ error: 'Payment has no YooKassa ID' })
    }

    if (!SHOP_ID || !SECRET_KEY) {
      return res.status(500).json({ error: 'YooKassa credentials not configured' })
    }

    // Получаем актуальный статус из ЮКассы
    const payment = await getPayment(SHOP_ID, SECRET_KEY, dbPayment.yookassaId)

    // Обновляем статус в БД
    await prisma.payment.update({
      where: { id: dbPayment.id },
      data: { 
        status: payment.status,
        paymentMethod: payment.metadata?.payment_method || null
      }
    })

    // Если платеж успешен - активируем подписку
    if (payment.status === 'succeeded' && dbPayment.status !== 'succeeded') {
      const metadata = dbPayment.metadata ? JSON.parse(dbPayment.metadata) : {}
      const plan = SUBSCRIPTION_PLANS[metadata.planId as keyof typeof SUBSCRIPTION_PLANS]

      if (plan) {
        const now = new Date()
        const expiresAt = new Date(now)
        expiresAt.setDate(expiresAt.getDate() + plan.durationDays)

        await prisma.user.update({
          where: { id: user.id },
          data: {
            subscriptionType: 'premium',
            subscriptionStatus: 'active',
            subscriptionStartedAt: user.subscriptionStartedAt || now,
            subscriptionExpiresAt: expiresAt
          }
        })
      }
    }

    res.json({
      paymentId: dbPayment.id,
      status: payment.status,
      subscriptionActive: payment.status === 'succeeded'
    })
  } catch (error: any) {
    console.error('Error checking payment status:', error)
    res.status(500).json({ 
      error: 'Failed to check payment status',
      message: error.message 
    })
  }
}