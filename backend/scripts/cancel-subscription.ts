/**
 * Скрипт для отмены подписки и очистки истории платежей
 * Использование: npx tsx scripts/cancel-subscription.ts TELEGRAM_ID
 * Пример: npx tsx scripts/cancel-subscription.ts 328974903
 */

import prisma from '../src/utils/prisma'

const telegramIdArg = process.argv[2]

if (!telegramIdArg) {
  console.error('❌ Ошибка: Укажите Telegram ID')
  console.log('')
  console.log('Использование: npx tsx scripts/cancel-subscription.ts TELEGRAM_ID')
  console.log('Пример: npx tsx scripts/cancel-subscription.ts 328974903')
  console.log('')
  console.log('Чтобы узнать свой Telegram ID:')
  console.log('1. Откройте приложение через Telegram бота')
  console.log('2. Откройте DevTools (F12) в браузере')
  console.log('3. В консоли выполните: window.Telegram.WebApp.initDataUnsafe.user.id')
  process.exit(1)
}

async function cancelSubscription() {
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
      console.log(`\n💳 Платежи пользователя (будут удалены):`)
      user.payments.forEach((payment, index) => {
        console.log(`   ${index + 1}. ${payment.amount} ₽, статус: ${payment.status}, дата: ${payment.createdAt.toLocaleDateString('ru-RU')}`)
      })
    }

    console.log(`\n🔄 Отмена подписки и очистка истории платежей...`)
    
    // Удаляем все платежи
    if (user._count.payments > 0) {
      const deleteResult = await prisma.payment.deleteMany({
        where: { userId: user.id }
      })
      console.log(`✅ Удалено платежей: ${deleteResult.count}`)
    }

    // Сбрасываем подписку на Free
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionType: 'free',
        subscriptionStatus: 'active',
        subscriptionExpiresAt: null,
        subscriptionStartedAt: null
      }
    })

    console.log(`✅ Подписка успешно отменена:`)
    console.log(`   Тип: ${updatedUser.subscriptionType}`)
    console.log(`   Статус: ${updatedUser.subscriptionStatus}`)
    console.log(`   Истекает: ${updatedUser.subscriptionExpiresAt ? updatedUser.subscriptionExpiresAt.toLocaleDateString('ru-RU') : 'не установлено'}`)

    console.log(`\n🎉 Готово! Подписка отменена, история платежей очищена.`)
    
    await prisma.$disconnect()
  } catch (error: any) {
    console.error('\n❌ Ошибка при отмене подписки:', error.message)
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  }
}

cancelSubscription()
