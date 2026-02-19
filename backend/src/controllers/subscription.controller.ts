import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { createPayment, getPayment } from '../utils/yookassa'
import { config } from '../config'

// Тарифы подписки (обратно совместимы с существующими planId)
const SUBSCRIPTION_PLANS = {
  month: {
    name: 'Месяц',
    price: 79,
    durationDays: 30
  },
  year: {
    name: 'Год',
    price: 699,
    durationDays: 365
  },
  lifetime: {
    name: 'Навсегда',
    price: 2199,
    // Условно 100 лет — для расчёта subscriptionExpiresAt; в UI показываем «навсегда»
    durationDays: 36525
  }
}

/**
 * Получить статус подписки пользователя
 */
export async function getSubscriptionStatus(req: Request, res: Response) {
  try {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }

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

    // Проверяем, есть ли pending платеж - если есть, не устанавливаем expired
    const hasPendingPayment = userWithSubscription.payments.some(
      p => p.status === 'pending' && 
      new Date(p.createdAt) > new Date(now.getTime() - 24 * 60 * 60 * 1000) // Платеж создан не более 24 часов назад
    )

    // Автоматически обновляем статус если подписка истекла
    // НО только если нет pending платежа (чтобы не сбрасывать статус во время обработки оплаты)
    let finalSubscriptionStatus = userWithSubscription.subscriptionStatus || 'free'
    
    if (!isActive && userWithSubscription.subscriptionStatus === 'active' && !hasPendingPayment) {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: 'expired' }
      })
      finalSubscriptionStatus = 'expired'
    } else if (!isActive && hasPendingPayment) {
      // Если есть pending платеж, не возвращаем expired, даже если подписка не активна
      // Это позволяет пользователю видеть, что платеж обрабатывается
      finalSubscriptionStatus = userWithSubscription.subscriptionStatus || 'free'
    } else if (!isActive) {
      // Если подписка не активна и нет pending платежа, возвращаем текущий статус или free
      finalSubscriptionStatus = userWithSubscription.subscriptionStatus || 'free'
    } else {
      // Подписка активна
      finalSubscriptionStatus = 'active'
    }

    const daysRemaining = userWithSubscription.subscriptionExpiresAt && userWithSubscription.subscriptionExpiresAt > now
      ? Math.ceil((userWithSubscription.subscriptionExpiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0

    // Определяем, какой платеж является текущим активным
    // Если подписка активна, то последний успешный платеж считается текущим активным
    // Платежи уже отсортированы по createdAt desc, поэтому первый успешный и есть последний
    let activePaymentId: string | null = null
    if (isActive) {
      const activePayment = userWithSubscription.payments.find(p => p.status === 'succeeded')
      if (activePayment) {
        activePaymentId = activePayment.id
      }
    }

    res.json({
      subscriptionType: userWithSubscription.subscriptionType || 'free',
      subscriptionStatus: isActive ? 'active' : finalSubscriptionStatus,
      subscriptionExpiresAt: userWithSubscription.subscriptionExpiresAt?.toISOString() || null,
      subscriptionStartedAt: userWithSubscription.subscriptionStartedAt?.toISOString() || null,
      daysRemaining: isActive ? daysRemaining : 0,
      recentPayments: userWithSubscription.payments.map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        isActive: p.id === activePaymentId // Помечаем текущий активный платеж
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
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
    const { planId } = req.body

    const planKey = planId as keyof typeof SUBSCRIPTION_PLANS
    if (!planId || !SUBSCRIPTION_PLANS[planKey]) {
      return res.status(400).json({ error: 'Invalid plan ID' })
    }

    // КРИТИЧНО: Проверяем pending платежи за последние 30 минут
    const recentPendingPayment = await prisma.payment.findFirst({
      where: {
        userId: user.id,
        status: 'pending',
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Последние 30 минут
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (recentPendingPayment && recentPendingPayment.yookassaId) {
      console.log('⚠️  Found recent pending payment, checking status in YooKassa...')
      
      try {
        // Проверяем актуальный статус в YooKassa
        const yookassaPayment = await getPayment(
          config.yookassa.shopId,
          config.yookassa.secretKey,
          recentPendingPayment.yookassaId
        )
        
        console.log(`   YooKassa status: ${yookassaPayment.status}`)
        
        // Обновляем статус в БД
        await prisma.payment.update({
          where: { id: recentPendingPayment.id },
          data: { status: yookassaPayment.status }
        })

        // Если платеж успешен - не создаем новый
        if (yookassaPayment.status === 'succeeded') {
          console.log('✅ Payment already succeeded, not creating duplicate')
          return res.status(400).json({ 
            error: 'Payment already completed',
            message: 'Платеж уже обработан. Обновите страницу.'
          })
        }
        
        // Если все еще pending - возвращаем существующий
        if (yookassaPayment.status === 'pending') {
          console.log('⏳ Payment still pending, returning existing payment')
          return res.status(409).json({
            error: 'Payment already in progress',
            message: 'У вас уже есть платеж в обработке. Завершите его или подождите.',
            paymentId: recentPendingPayment.id,
            existingPayment: true
          })
        }
      } catch (error) {
        console.error('❌ Error checking payment status:', error)
        // Продолжаем создание нового платежа если проверка не удалась
      }
    }

    const plan = SUBSCRIPTION_PLANS[planKey]

    const botUsername = config.telegram.botUsername
    const webAppUrl = config.webAppUrl
    
    if (!botUsername) {
      throw new Error('TELEGRAM_BOT_USERNAME не установлен. Установите в переменных окружения.')
    }
    
    // Возврат после оплаты — сразу в бота
    const returnUrl = `https://t.me/${botUsername}`

    console.log('💳 Payment return URL:', returnUrl)
    console.log('   Bot username:', botUsername)
    console.log('   WebApp URL:', webAppUrl)

    // КРИТИЧНО: Генерируем стабильный idempotence ключ
    // Это предотвращает создание дублей при повторных запросах
    // Формат: userId-planId-округленное_время (до 5 минут)
    const timeWindow = Math.floor(Date.now() / (5 * 60 * 1000)) // Окно 5 минут
    const idempotenceKey = `${user.id}-${planId}-${timeWindow}`
    
    console.log('💳 Creating payment with idempotence key:', idempotenceKey)

    // Создаем платеж в ЮКассе
    const payment = await createPayment(
      config.yookassa.shopId,
      config.yookassa.secretKey,
      plan.price,
      `Подписка "${plan.name}" - Трекер привычек`,
      returnUrl,
      {
        userId: user.id,
        planId: planId,
        telegramId: user.telegramId.toString()
      },
      idempotenceKey
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

    // УБРАНО: polling через setTimeout не работает в serverless (Vercel)
    // Активация подписки происходит только через webhook от YooKassa
    console.log('💡 Payment created. Waiting for webhook from YooKassa to activate subscription.')
    console.log('   Webhook URL should be: https://your-domain.com/api/payments/webhook')

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
 * Проверить статус последнего платежа пользователя и обновить подписку
 * Используется после возврата с Юмани для проверки статуса оплаты
 */
export async function checkLatestPaymentStatus(req: Request, res: Response) {
  try {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }

    // Находим последний платеж пользователя
    const latestPayment = await prisma.payment.findFirst({
      where: {
        userId: user.id
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!latestPayment) {
      return res.json({
        hasPayment: false,
        message: 'No payments found'
      })
    }

    // Если платеж уже успешен, возвращаем статус
    if (latestPayment.status === 'succeeded') {
      // Проверяем, активна ли подписка
      const userWithSubscription = await prisma.user.findUnique({
        where: { id: user.id }
      })

      const isActive = 
        userWithSubscription?.subscriptionStatus === 'active' &&
        userWithSubscription?.subscriptionExpiresAt &&
        userWithSubscription.subscriptionExpiresAt > new Date()

      return res.json({
        hasPayment: true,
        paymentId: latestPayment.id,
        status: latestPayment.status,
        subscriptionActive: isActive
      })
    }

    // Если платеж pending или canceled, проверяем его статус в ЮКассе
    if (!latestPayment.yookassaId) {
      return res.status(400).json({ error: 'Payment has no YooKassa ID' })
    }

    // Получаем актуальный статус из ЮКассы
    const payment = await getPayment(
      config.yookassa.shopId,
      config.yookassa.secretKey,
      latestPayment.yookassaId
    )

    // Обновляем статус в БД
    await prisma.payment.update({
      where: { id: latestPayment.id },
      data: { 
        status: payment.status,
        paymentMethod: payment.metadata?.payment_method || null
      }
    })

    // Если платеж успешен - активируем подписку
    if (payment.status === 'succeeded' && latestPayment.status !== 'succeeded') {
      const metadata = latestPayment.metadata ? JSON.parse(latestPayment.metadata) : {}
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

    // Проверяем финальный статус подписки
    const userWithSubscription = await prisma.user.findUnique({
      where: { id: user.id }
    })

    const isActive = 
      userWithSubscription?.subscriptionStatus === 'active' &&
      userWithSubscription?.subscriptionExpiresAt &&
      userWithSubscription.subscriptionExpiresAt > new Date()

    res.json({
      hasPayment: true,
      paymentId: latestPayment.id,
      status: payment.status,
      subscriptionActive: isActive
    })
  } catch (error: any) {
    console.error('Error checking latest payment status:', error)
    res.status(500).json({ 
      error: 'Failed to check payment status',
      message: error.message 
    })
  }
}

/**
 * Проверить статус платежа и обновить подписку
 */
export async function checkPaymentStatus(req: Request, res: Response) {
  try {
    const user = req.user
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
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

    // Получаем актуальный статус из ЮКассы
    const payment = await getPayment(
      config.yookassa.shopId,
      config.yookassa.secretKey,
      dbPayment.yookassaId
    )

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