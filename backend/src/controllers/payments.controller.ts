import { Request, Response } from 'express'
import prisma from '../utils/prisma'
import { getPayment, validateWebhookSignature } from '../utils/yookassa'

const SHOP_ID = process.env.YUKASSA_SHOP_ID!
const SECRET_KEY = process.env.YUKASSA_SECRET_KEY!

/**
 * Webhook от ЮКассы для уведомлений о статусе платежа
 * Документация: https://yookassa.ru/developers/payments/payment-notifications
 */
export async function webhook(req: Request, res: Response) {
  try {
    // ЮКасса требует быстрого ответа (200 OK)
    // Обработку платежа лучше делать асинхронно
    res.status(200).json({ received: true })

    const event = req.body
    const signature = req.headers['x-yookassa-signature'] as string

    console.log('📦 YooKassa webhook received:', event.type, event.object?.id)

    // Валидация подписи (в продакшене обязательно!)
    // if (!validateWebhookSignature(event, signature)) {
    //   console.error('Invalid webhook signature')
    //   return
    // }

    // Обрабатываем только события платежей
    if (event.type !== 'payment.succeeded' && event.type !== 'payment.canceled') {
      console.log('Ignoring event type:', event.type)
      return
    }

    const payment = event.object
    if (!payment || !payment.id) {
      console.error('Invalid payment data in webhook')
      return
    }

    // Ищем платеж в БД
    const dbPayment = await prisma.payment.findUnique({
      where: { yookassaId: payment.id },
      include: { user: true }
    })

    if (!dbPayment) {
      console.error('Payment not found in DB:', payment.id)
      return
    }

    // Получаем актуальный статус из ЮКассы (для надежности)
    const latestPayment = await getPayment(SHOP_ID, SECRET_KEY, payment.id)

    // Обновляем статус платежа
    await prisma.payment.update({
      where: { id: dbPayment.id },
      data: {
        status: latestPayment.status,
        paymentMethod: latestPayment.metadata?.payment_method || null,
        updatedAt: new Date()
      }
    })

    // Если платеж успешен - активируем подписку
    if (latestPayment.status === 'succeeded' && dbPayment.status !== 'succeeded') {
      const metadata = dbPayment.metadata ? JSON.parse(dbPayment.metadata) : {}
      const planId = metadata.planId

      if (planId) {
        const SUBSCRIPTION_PLANS: Record<string, { durationDays: number }> = {
          month: { durationDays: 30 },
          year: { durationDays: 365 }
        }

        const plan = SUBSCRIPTION_PLANS[planId]
        if (plan) {
          const user = dbPayment.user
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

          console.log(`✅ Subscription activated for user ${user.id}, expires at ${expiresAt}`)
        }
      }
    }

    console.log(`✅ Payment ${payment.id} status updated to ${latestPayment.status}`)
  } catch (error: any) {
    console.error('❌ Error processing webhook:', error)
    // Не возвращаем ошибку, чтобы ЮКасса не пыталась повторно
  }
}