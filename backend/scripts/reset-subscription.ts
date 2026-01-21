/**
 * Скрипт для сброса подписки пользователя
 * Использование: npx tsx scripts/reset-subscription.ts TELEGRAM_ID
 * Пример: npx tsx scripts/reset-subscription.ts 328974903
 * 
 * Этот скрипт:
 * - Сбрасывает subscriptionType на "free"
 * - Сбрасывает subscriptionStatus на "active"
 * - Очищает subscriptionExpiresAt и subscriptionStartedAt
 * - Опционально удаляет все платежи (если передать флаг --clear-payments)
 */

import prisma from '../src/utils/prisma'

const telegramIdArg = process.argv[2]
const clearPayments = process.argv.includes('--clear-payments')

if (!telegramIdArg) {
  console.error('❌ Ошибка: Укажите Telegram ID')
  console.log('Использование: npx tsx scripts/reset-subscription.ts TELEGRAM_ID [--clear-payments]')
  console.log('Пример: npx tsx scripts/reset-subscription.ts 328974903')
  console.log('Пример с удалением платежей: npx tsx scripts/reset-subscription.ts 328974903 --clear-payments')
  process.exit(1)
}

async function resetSubscription() {
  try {
    const telegramId = BigInt(telegramIdArg.trim())
    
    console.log(`🔍 Поиск пользователя с telegram_id: ${telegramId.toString()}`)
    
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { payments: true, habits: true }
        }
      }
    })

    if (!user) {
      console.log(`❌ Пользователь с telegram_id ${telegramId.toString()} не найден в базе данных`)
      await prisma.$disconnect()
      process.exit(1)
    }

    console.log(`\n✅ Найден пользователь:`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Telegram ID: ${user.telegramId.toString()}`)
    console.log(`   Текущий тип подписки: ${user.subscriptionType || 'free'}`)
    console.log(`   Текущий статус: ${user.subscriptionStatus || 'active'}`)
    console.log(`   Истекает: ${user.subscriptionExpiresAt?.toLocaleDateString('ru-RU') || 'не установлено'}`)
    console.log(`   Начало: ${user.subscriptionStartedAt?.toLocaleDateString('ru-RU') || 'не установлено'}`)
    console.log(`   Платежей: ${user._count.payments}`)
    console.log(`   Привычек: ${user._count.habits}`)

    if (user._count.payments > 0) {
      console.log(`\n💳 Платежи пользователя:`)
      user.payments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ${payment.amount} ₽, статус: ${payment.status}, дата: ${payment.createdAt.toLocaleDateString('ru-RU')}`)
      })
    }

    console.log(`\n🔄 Сброс подписки на Free...`)
    
    // Сбрасываем подписку
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionType: 'free',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: null,
        subscriptionStartedAt: null
      }
    })

    console.log(`✅ Подписка успешно сброшена:`)
    console.log(`   Тип: ${updatedUser.subscriptionType}`)
    console.log(`   Статус: ${updatedUser.subscriptionStatus}`)
    console.log(`   Истекает: ${updatedUser.subscriptionExpiresAt ? updatedUser.subscriptionExpiresAt.toLocaleDateString('ru-RU') : 'не установлено'}`)

    // Опционально удаляем платежи
    if (clearPayments && user._count.payments > 0) {
      console.log(`\n🗑️  Удаление платежей...`)
      const deleteResult = await prisma.payment.deleteMany({
        where: { userId: user.id }
      })
      console.log(`✅ Удалено платежей: ${deleteResult.count}`)
    } else if (!clearPayments && user._count.payments > 0) {
      console.log(`\n💡 Платежи сохранены (для удаления используйте флаг --clear-payments)`)
    }

    console.log(`\n🎉 Готово! Пользователь теперь на Free плане.`)
    
    await prisma.$disconnect()
  } catch (error: any) {
    console.error('\n❌ Ошибка при сбросе подписки:', error.message)
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

resetSubscription()
