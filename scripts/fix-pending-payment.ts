/**
 * Скрипт для исправления зависших pending платежей
 * Проверяет статус в YooKassa и обновляет базу данных
 */

import { PrismaClient } from '@prisma/client'
import { config } from '../backend/src/config'
import { getPayment } from '../backend/src/utils/yookassa'

const prisma = new PrismaClient()

async function fixPendingPayment(paymentId?: string) {
  try {
    console.log('🔍 Searching for pending payments...\n')

    // Находим pending платежи
    const pendingPayments = await prisma.payment.findMany({
      where: paymentId 
        ? { id: paymentId, status: 'pending' }
        : { status: 'pending' },
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (pendingPayments.length === 0) {
      console.log('✅ No pending payments found')
      return
    }

    console.log(`📦 Found ${pendingPayments.length} pending payment(s)\n`)

    for (const payment of pendingPayments) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Payment ID: ${payment.id}`)
      console.log(`YooKassa ID: ${payment.yookassaId}`)
      console.log(`User ID: ${payment.userId}`)
      console.log(`Telegram ID: ${payment.user.telegramId}`)
      console.log(`Amount: ${payment.amount} RUB`)
      console.log(`Created: ${payment.createdAt}`)
      console.log(`Current status in DB: ${payment.status}`)

      if (!payment.yookassaId) {
        console.log('❌ No YooKassa ID - cannot check status')
        continue
      }

      try {
        // Проверяем статус в YooKassa
        console.log('\n🔄 Checking status in YooKassa...')
        const yookassaPayment = await getPayment(
          config.yookassa.shopId,
          config.yookassa.secretKey,
          payment.yookassaId
        )

        console.log(`📊 YooKassa status: ${yookassaPayment.status}`)

        if (yookassaPayment.status === payment.status) {
          console.log('ℹ️  Status unchanged - no update needed')
          continue
        }

        // Обновляем статус в базе
        console.log(`\n🔄 Updating status: ${payment.status} → ${yookassaPayment.status}`)
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: yookassaPayment.status,
            updatedAt: new Date()
          }
        })
        console.log('✅ Payment status updated')

        // Если платеж успешен - активируем подписку
        if (yookassaPayment.status === 'succeeded') {
          console.log('\n💎 Payment succeeded! Activating subscription...')
          
          const metadata = payment.metadata ? JSON.parse(payment.metadata) : {}
          const planId = metadata.planId
          
          if (!planId) {
            console.log('❌ Plan ID not found in metadata')
            continue
          }

          const PLANS: Record<string, { durationDays: number }> = {
            month: { durationDays: 30 },
            year: { durationDays: 365 }
          }

          const plan = PLANS[planId]
          if (!plan) {
            console.log('❌ Unknown plan:', planId)
            continue
          }

          const now = new Date()
          const user = payment.user

          // Если есть активная подписка - продлеваем, иначе создаем новую
          let expiresAt: Date
          if (
            user.subscriptionStatus === 'active' &&
            user.subscriptionExpiresAt &&
            new Date(user.subscriptionExpiresAt) > now
          ) {
            expiresAt = new Date(user.subscriptionExpiresAt)
            expiresAt.setDate(expiresAt.getDate() + plan.durationDays)
            console.log('🔄 Extending existing subscription')
          } else {
            expiresAt = new Date(now)
            expiresAt.setDate(expiresAt.getDate() + plan.durationDays)
            console.log('🆕 Creating new subscription')
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

          console.log('✅ Subscription activated!')
          console.log(`   Plan: ${planId}`)
          console.log(`   Expires at: ${expiresAt.toISOString()}`)
          console.log(`   User: ${user.telegramId}`)
        } else if (yookassaPayment.status === 'canceled') {
          console.log('❌ Payment was canceled')
        } else {
          console.log(`ℹ️  Payment status: ${yookassaPayment.status}`)
        }

      } catch (error: any) {
        console.error('❌ Error checking payment:', error.message)
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('✅ Done!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Запуск
const paymentId = process.argv[2] // Можно передать конкретный ID платежа
fixPendingPayment(paymentId)
