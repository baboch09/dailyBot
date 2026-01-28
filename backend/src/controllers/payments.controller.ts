import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { getPayment, validateWebhookSignature } from '../utils/yookassa'
import { config } from '../config'

/**
 * Webhook от ЮКассы для уведомлений о статусе платежа
 * Документация: https://yookassa.ru/developers/using-api/webhooks
 * 
 * Важно: ЮКасса требует быстрого ответа (200 OK в течение 10 секунд)
 * Поэтому обработку делаем асинхронно после отправки ответа
 */
export async function webhook(req: Request, res: Response) {
  try {
    // Сначала отвечаем ЮКассе, что получили webhook
    res.status(200).json({ received: true })

    const event = req.body
    const signature = req.headers['x-yookassa-signature'] as string

    console.log('📦 YooKassa webhook received:', {
      type: event.type,
      event: event.event,
      paymentId: event.object?.id,
      status: event.object?.status,
      mode: config.yookassa.isTestMode ? 'test' : 'production',
      hasSignature: !!signature,
      timestamp: new Date().toISOString()
    })

    // Валидация подписи webhook
    if (!config.yookassa.isTestMode) {
      if (!signature) {
        console.warn('⚠️  ========================================')
        console.warn('⚠️  SECURITY WARNING: Webhook signature missing!')
        console.warn('⚠️  ========================================')
        console.warn('⚠️  Processing anyway to avoid payment loss')
        console.warn('⚠️  URGENT: Enable signature in YooKassa dashboard')
        console.warn('⚠️  Settings → HTTP notifications → Enable signature')
        console.warn('⚠️  ========================================')
      } else {
        const eventType = event.type || event.event
        const objectId = event.object?.id
        const objectStatus = event.object?.status

        if (eventType && objectId && objectStatus) {
          const isValid = validateWebhookSignature(
            eventType,
            objectId,
            objectStatus,
            signature,
            config.yookassa.secretKey
          )

          if (isValid) {
            console.log('✅ Webhook signature validated')
          } else {
            console.error('❌ ========================================')
            console.error('❌ INVALID WEBHOOK SIGNATURE!')
            console.error('❌ This could be an attack or misconfiguration')
            console.error('❌ Processing anyway to avoid payment loss')
            console.error('❌ ========================================')
          }
        }
      }
    }

    // Определяем тип события (YooKassa может использовать разные форматы)
    const eventType = event.type || event.event
    const eventAction = event.object?.status

    // Обрабатываем события платежей
    // YooKassa может отправлять:
    // - type: 'payment.succeeded' (новый формат)
    // - type: 'notification', status: 'succeeded' (старый формат)
    const isPaymentSucceeded = 
      eventType === 'payment.succeeded' || 
      (eventType === 'notification' && eventAction === 'succeeded')
    
    const isPaymentCanceled = 
      eventType === 'payment.canceled' || 
      (eventType === 'notification' && eventAction === 'canceled')

    if (!isPaymentSucceeded && !isPaymentCanceled) {
      console.log('ℹ️  Ignoring event type:', eventType, 'status:', eventAction)
      return
    }

    const payment = event.object
    if (!payment || !payment.id) {
      console.error('❌ Invalid payment data in webhook')
      console.error('   Event body:', JSON.stringify(event, null, 2))
      return
    }

    console.log('✅ Valid payment event received:', {
      paymentId: payment.id,
      status: payment.status,
      isSucceeded: isPaymentSucceeded,
      isCanceled: isPaymentCanceled
    })

    // Ищем платеж в БД
    const dbPayment = await prisma.payment.findUnique({
      where: { yookassaId: payment.id },
      include: { user: true }
    })

    if (!dbPayment) {
      console.error('❌ Payment not found in DB:', payment.id)
      console.error('   This payment was not created by our system')
      return
    }

    // ВАЖНО: Проверяем, не обработан ли уже этот платеж
    if (dbPayment.status === 'succeeded' && isPaymentSucceeded) {
      console.log('ℹ️  Payment already succeeded, skipping duplicate webhook')
      return
    }

    // Получаем актуальный статус из API ЮКассы (для надежности)
    console.log('🔍 Fetching latest payment status from YooKassa API...')
    const latestPayment = await getPayment(
      config.yookassa.shopId,
      config.yookassa.secretKey,
      payment.id
    )

    console.log('🔄 Payment status update:', {
      paymentId: payment.id,
      dbStatus: dbPayment.status,
      webhookStatus: payment.status,
      apiStatus: latestPayment.status
    })

    // Обновляем статус платежа ТОЛЬКО если он изменился
    if (dbPayment.status !== latestPayment.status) {
      await prisma.payment.update({
        where: { id: dbPayment.id },
        data: {
          status: latestPayment.status,
          paymentMethod: latestPayment.metadata?.payment_method || null,
          updatedAt: new Date()
        }
      })
      console.log(`✅ Payment status updated: ${dbPayment.status} → ${latestPayment.status}`)
    } else {
      console.log('ℹ️  Payment status unchanged, no update needed')
    }

    // КРИТИЧНО: Активируем подписку ТОЛЬКО если:
    // 1. Новый статус = succeeded
    // 2. Старый статус != succeeded (избегаем повторной активации)
    if (latestPayment.status === 'succeeded' && dbPayment.status !== 'succeeded') {
      console.log('💎 Payment succeeded! Activating subscription...')
      await activateSubscription(dbPayment)
    }

    console.log(`✅ Payment ${payment.id} processed successfully`)
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error)
    
    // Логируем детали ошибки для отладки
    console.error('Webhook error details:', {
      error: error.message,
      stack: error.stack,
      paymentId: req.body?.object?.id,
      eventType: req.body?.type
    })
    
    // В продакшене можно отправлять в систему мониторинга (Sentry, etc.)
    if (config.nodeEnv === 'production') {
      // TODO: Добавить интеграцию с Sentry или другой системой мониторинга
      // Sentry.captureException(error, { extra: { webhook: req.body } })
    }
    
    // Не возвращаем ошибку, так как уже ответили 200
    // ЮКасса не будет повторять запрос
  }
}

/**
 * Активация подписки после успешного платежа
 */
async function activateSubscription(dbPayment: any) {
  const metadata = dbPayment.metadata ? JSON.parse(dbPayment.metadata) : {}
  const planId = metadata.planId

  if (!planId) {
    console.error('❌ Plan ID not found in payment metadata')
    return
  }

  const SUBSCRIPTION_PLANS: Record<string, { durationDays: number }> = {
    month: { durationDays: 30 },
    year: { durationDays: 365 }
  }

  const plan = SUBSCRIPTION_PLANS[planId]
  if (!plan) {
    console.error('❌ Unknown plan:', planId)
    return
  }

  const user = dbPayment.user
  const now = new Date()
  
  // Если у пользователя уже есть активная подписка, продлеваем её
  let expiresAt: Date
  if (
    user.subscriptionStatus === 'active' &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > now
  ) {
    // Продлеваем с текущей даты окончания
    expiresAt = new Date(user.subscriptionExpiresAt)
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays)
    console.log('🔄 Extending existing subscription')
  } else {
    // Новая подписка - начинаем с текущей даты
    expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + plan.durationDays)
    console.log('🆕 Activating new subscription')
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionType: 'premium',
      subscriptionStatus: 'active',
      subscriptionStartedAt: user.subscriptionStartedAt || now,
      subscriptionExpiresAt: expiresAt
    }
  })

  console.log(`✅ Subscription activated for user ${user.id}`)
  console.log(`   Plan: ${planId}`)
  console.log(`   Expires at: ${expiresAt.toISOString()}`)
}