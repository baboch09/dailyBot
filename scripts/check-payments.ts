/**
 * Быстрая проверка статуса всех платежей
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPayments() {
  try {
    console.log('🔍 Checking all payments...\n')

    const payments = await prisma.payment.findMany({
      include: {
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    if (payments.length === 0) {
      console.log('No payments found')
      return
    }

    console.log(`Found ${payments.length} payment(s):\n`)
    console.log('=' .repeat(80))

    for (const payment of payments) {
      const statusEmoji = 
        payment.status === 'succeeded' ? '✅' :
        payment.status === 'pending' ? '⏳' :
        payment.status === 'canceled' ? '❌' : '❓'

      console.log(`\n${statusEmoji} Payment: ${payment.id}`)
      console.log(`   YooKassa ID: ${payment.yookassaId}`)
      console.log(`   Status: ${payment.status}`)
      console.log(`   Amount: ${payment.amount} RUB`)
      console.log(`   User Telegram ID: ${payment.user.telegramId}`)
      console.log(`   User Subscription: ${payment.user.subscriptionStatus}`)
      console.log(`   Created: ${payment.createdAt.toISOString()}`)
      
      if (payment.status === 'pending') {
        const ageMinutes = Math.floor((Date.now() - payment.createdAt.getTime()) / 60000)
        console.log(`   ⚠️  PENDING for ${ageMinutes} minutes!`)
      }
    }

    console.log('\n' + '='.repeat(80))

    // Статистика
    const pendingCount = payments.filter(p => p.status === 'pending').length
    const succeededCount = payments.filter(p => p.status === 'succeeded').length
    const canceledCount = payments.filter(p => p.status === 'canceled').length

    console.log('\n📊 Statistics:')
    console.log(`   ⏳ Pending: ${pendingCount}`)
    console.log(`   ✅ Succeeded: ${succeededCount}`)
    console.log(`   ❌ Canceled: ${canceledCount}`)

    if (pendingCount > 0) {
      console.log('\n⚠️  WARNING: You have pending payments!')
      console.log('   Run: npx tsx scripts/fix-pending-payment.ts')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPayments()
